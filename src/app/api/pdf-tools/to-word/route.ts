import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak,
} from 'docx';
import { processFile } from '@/lib/ilovepdf';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'لم يتم تقديم ملف. يرجى إرفاق ملف PDF.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: 'نوع الملف غير مدعوم. يرجى إرفاق ملف PDF فقط.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'حجم الملف يتجاوز الحد المسموح (50 ميغابايت).' },
        { status: 400 }
      );
    }

    const baseName = file.name.replace(/\.pdf$/i, '');

    // Try ILOVEPDF API
    const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
    const secretKey = process.env.ILOVEPDF_SECRET_KEY;

    if (publicKey && secretKey) {
      try {
        const resultBuffer = await processFile(publicKey, secretKey, 'office', file, file.name, {
          output_format: 'docx',
        });
        return new NextResponse(resultBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${baseName}.docx"`,
          },
        });
      } catch (err) {
        console.warn('ILOVEPDF to-word error, using fallback:', err);
      }
    }

    // Fallback: Local PDF to Word conversion
    const fileBuffer = new Uint8Array(await file.arrayBuffer());
    const rawText = new TextDecoder('latin1').decode(fileBuffer);
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    const allTextMatches: { index: number; text: string }[] = [];

    let match: RegExpExecArray | null;
    while ((match = tjRegex.exec(rawText)) !== null) {
      allTextMatches.push({ index: match.index, text: match[1] });
    }

    const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();
    const textPerPage = Math.max(1, Math.ceil(allTextMatches.length / totalPages));

    const paragraphs: Paragraph[] = [];

    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: `المصدر: ${file.name}`, italics: true, size: 20, color: '666666' })],
      spacing: { after: 200 },
    }));

    for (let i = 0; i < totalPages; i++) {
      const startIdx = i * textPerPage;
      const endIdx = Math.min(startIdx + textPerPage, allTextMatches.length);
      const pageText = allTextMatches.slice(startIdx, endIdx).map(m => m.text).join(' ').trim();

      if (i > 0) paragraphs.push(new Paragraph({ children: [new PageBreak()] }));

      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `صفحة ${i + 1}`, bold: true, size: 24, color: '333333' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }));

      const lines = pageText.split('\n').filter(l => l.trim());
      for (const line of lines) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { after: 120 },
        }));
      }
    }

    const doc = new Document({
      sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: paragraphs }],
    });
    const docxBuffer = await Packer.toBuffer(doc);

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${baseName}.docx"`,
        'Content-Length': String(docxBuffer.length),
      },
    });

  } catch (error) {
    console.error('PDF to Word error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تحويل الملف.' },
      { status: 500 }
    );
  }
}
