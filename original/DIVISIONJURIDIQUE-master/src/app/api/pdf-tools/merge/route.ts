import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { processMultipleFiles } from '@/lib/ilovepdf';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length < 2) {
      return NextResponse.json(
        { success: false, error: 'يجب تقديم ملفين PDF على الأقل للدمج.' },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json(
          { success: false, error: `نوع الملف "${file.name}" غير مدعوم.` },
          { status: 400 }
        );
      }
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'حجم الملفات الإجمالي يتجاوز الحد المسموح (50 ميغابايت).' },
        { status: 400 }
      );
    }

    // Try ILOVEPDF API
    const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
    const secretKey = process.env.ILOVEPDF_SECRET_KEY;

    if (publicKey && secretKey) {
      try {
        const filesData = files.map(f => ({ file: f, fileName: f.name }));
        const resultBuffer = await processMultipleFiles(publicKey, secretKey, 'merge', filesData);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return new NextResponse(resultBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="merged_${timestamp}.pdf"`,
          },
        });
      } catch (err) {
        console.warn('ILOVEPDF merge error, using fallback:', err);
      }
    }

    // Fallback: Local merge using pdf-lib
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
      const pageIndices = pdf.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    const mergedBytes = await mergedPdf.save({ useObjectStreams: true, addDefaultPage: false });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    return new NextResponse(mergedBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="merged_${timestamp}.pdf"`,
        'Content-Length': String(mergedBytes.length),
      },
    });

  } catch (error) {
    console.error('PDF Merge error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء دمج الملفات.' },
      { status: 500 }
    );
  }
}
