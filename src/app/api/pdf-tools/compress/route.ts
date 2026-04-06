import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { processFile } from '@/lib/ilovepdf';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const compressionLevel = (formData.get('compression_level') as string) || 'recommended';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'لم يتم تقديم ملف' },
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
        { success: false, error: 'حجم الملف يتجاوز 50 ميغابايت' },
        { status: 400 }
      );
    }

    const originalSize = file.size;

    // Try ILOVEPDF API for high-quality compression
    const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
    const secretKey = process.env.ILOVEPDF_SECRET_KEY;

    if (publicKey && secretKey) {
      try {
        const resultBuffer = await processFile(
          publicKey,
          secretKey,
          'compress',
          file,
          file.name,
          { compression_level: compressionLevel }
        );

        const compressedSize = resultBuffer.byteLength;
        const savingsPercent = ((1 - compressedSize / originalSize) * 100).toFixed(1);

        return new NextResponse(resultBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="compressed_${file.name}"`,
            'X-Original-Size': String(originalSize),
            'X-Compressed-Size': String(compressedSize),
            'X-Savings-Percent': savingsPercent,
          },
        });
      } catch (err) {
        console.warn('ILOVEPDF compress error, using fallback:', err);
      }
    }

    // Fallback: Local compression using pdf-lib
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const originalPdf = await PDFDocument.load(originalBuffer, {
      ignoreEncryption: true,
    });
    const compressedPdf = await PDFDocument.create();
    const copiedPages = await compressedPdf.copyPages(
      originalPdf,
      originalPdf.getPageIndices()
    );
    copiedPages.forEach((page) => compressedPdf.addPage(page));
    const compressedBytes = await compressedPdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    const compressedSize = compressedBytes.length;
    const savingsPercent = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    return new NextResponse(Buffer.from(compressedBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compressed_${file.name}"`,
        'X-Original-Size': String(originalSize),
        'X-Compressed-Size': String(compressedSize),
        'X-Savings-Percent': savingsPercent,
      },
    });
  } catch (error) {
    console.error('PDF Compress error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء ضغط الملف' },
      { status: 500 }
    );
  }
}
