import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
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

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const originalPdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    const totalPages = originalPdf.getPageCount();

    if (totalPages === 0) {
      return NextResponse.json(
        { success: false, error: 'ملف PDF فارغ.' },
        { status: 400 }
      );
    }

    if (totalPages === 1) {
      return NextResponse.json(
        { success: false, error: 'ملف PDF يحتوي على صفحة واحدة فقط. لا حاجة لتقسيمه.' },
        { status: 400 }
      );
    }

    // Try ILOVEPDF API
    const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
    const secretKey = process.env.ILOVEPDF_SECRET_KEY;

    if (publicKey && secretKey) {
      try {
        const resultBuffer = await processFile(publicKey, secretKey, 'split', file, file.name, {
          ranges: `1-${totalPages}`,
        });
        const baseName = file.name.replace(/\.pdf$/i, '');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return new NextResponse(resultBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="split_${baseName}_${timestamp}.zip"`,
          },
        });
      } catch (err) {
        console.warn('ILOVEPDF split error, using fallback:', err);
      }
    }

    // Fallback: Local split using pdf-lib + JSZip
    const zip = new JSZip();
    const baseName = file.name.replace(/\.pdf$/i, '');

    for (let i = 0; i < totalPages; i++) {
      const singlePagePdf = await PDFDocument.create();
      const [copiedPage] = await singlePagePdf.copyPages(originalPdf, [i]);
      singlePagePdf.addPage(copiedPage);
      const pageBytes = await singlePagePdf.save({ useObjectStreams: true, addDefaultPage: false });
      const pageNumber = String(i + 1).padStart(String(totalPages).length, '0');
      zip.file(`${baseName}_page_${pageNumber}.pdf`, pageBytes);
    }

    const zipBuffer = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="split_${baseName}_${timestamp}.zip"`,
        'Content-Length': String(zipBuffer.length),
      },
    });

  } catch (error) {
    console.error('PDF Split error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تقسيم الملف.' },
      { status: 500 }
    );
  }
}
