import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import mammoth from 'mammoth';
import { readFile } from 'fs/promises';
import path from 'path';
import { processFile } from '@/lib/ilovepdf';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const FONT_SIZE = 11;
const LINE_HEIGHT = FONT_SIZE * 1.8;
const MAX_CHARS_PER_LINE = 60;
const BOTTOM_MARGIN = 50;

let cachedFontBytes: Uint8Array | null = null;

async function getArabicFont(): Promise<Uint8Array> {
  if (cachedFontBytes) return cachedFontBytes;
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansArabic-Regular.ttf');
    const buf = await readFile(fontPath);
    cachedFontBytes = new Uint8Array(buf);
    return cachedFontBytes;
  } catch {
    throw new Error('لم يتم العثور على خط عربي.');
  }
}

function wrapText(text: string): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') { lines.push(''); continue; }
    const words = paragraph.split(/\s+/);
    let currentLine = '';
    for (const word of words) {
      if (!word) continue;
      const estimatedWidth = (currentLine ? currentLine.length + 1 : 0) + word.length;
      if (estimatedWidth > MAX_CHARS_PER_LINE && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'لم يتم تقديم ملف.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ success: false, error: 'نوع الملف غير مدعوم. يرجى إرفاق ملف .docx فقط.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'حجم الملف يتجاوز 50 ميغابايت.' }, { status: 400 });
    }

    const baseName = file.name.replace(/\.docx$/i, '');

    // Try ILOVEPDF API
    const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
    const secretKey = process.env.ILOVEPDF_SECRET_KEY;

    if (publicKey && secretKey) {
      try {
        const resultBuffer = await processFile(publicKey, secretKey, 'office', file, file.name, {
          output_format: 'pdf',
        });
        return new NextResponse(resultBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
          },
        });
      } catch (err) {
        console.warn('ILOVEPDF from-word error, using fallback:', err);
      }
    }

    // Fallback: Local Word to PDF conversion
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
    const extractedText = result.value;

    if (!extractedText.trim()) {
      return NextResponse.json({ success: false, error: 'لم يتم العثور على نص في ملف Word.' }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const fontBytes = await getArabicFont();
    const arabicFont = await pdfDoc.embedFont(fontBytes);
    const allLines = wrapText(extractedText);

    let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let yPosition = PAGE_HEIGHT - MARGIN;

    try {
      const titleWidth = arabicFont.widthOfTextAtSize(baseName, 18);
      currentPage.drawText(baseName, { x: PAGE_WIDTH - MARGIN - titleWidth, y: yPosition, size: 18, font: arabicFont, color: rgb(0.15, 0.15, 0.15) });
      yPosition -= 30;
    } catch { /* skip */ }

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      if (yPosition < BOTTOM_MARGIN + LINE_HEIGHT) {
        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        yPosition = PAGE_HEIGHT - MARGIN;
      }
      if (line.trim() === '') { yPosition -= LINE_HEIGHT * 0.5; continue; }
      try {
        const fontSize = 11;
        const textWidth = arabicFont.widthOfTextAtSize(line, fontSize);
        currentPage.drawText(line, { x: PAGE_WIDTH - MARGIN - textWidth, y: yPosition, size: fontSize, font: arabicFont, color: rgb(0.1, 0.1, 0.1) });
      } catch (err) {
        console.warn('Failed to draw line:', line.substring(0, 50), err);
      }
      yPosition -= LINE_HEIGHT;
    }

    const pdfBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'Content-Length': String(pdfBytes.length),
      },
    });

  } catch (error) {
    console.error('Word to PDF error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء تحويل الملف.' }, { status: 500 });
  }
}
