import { NextRequest, NextResponse } from 'next/server';
import { processFile } from '@/lib/ilovepdf';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'لم يتم تقديم ملف. يرجى إرفاق ملف PDF أو صورة.' },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith('.pdf');
    const isImage = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.webp', '.gif'].some(ext => fileName.endsWith(ext));

    if (!isPDF && !isImage) {
      return NextResponse.json(
        { success: false, error: 'نوع الملف غير مدعوم. يرجى إرفاق ملف PDF أو صورة.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'حجم الملف يتجاوز الحد المسموح (50 ميغابايت).' },
        { status: 400 }
      );
    }

    // Try ILOVEPDF OCR API
    const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
    const secretKey = process.env.ILOVEPDF_SECRET_KEY;

    if (publicKey && secretKey) {
      try {
        const resultBuffer = await processFile(publicKey, secretKey, 'ocr', file, file.name, {
          ocr: true,
        });
        return new NextResponse(resultBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="ocr_${file.name.replace(/\.[^.]+$/, '.pdf')}"`,
          },
        });
      } catch (err) {
        console.warn('ILOVEPDF OCR error:', err);
      }
    }

    // Fallback: OCR.Space free API
    const apiFormData = new FormData();
    apiFormData.append('file', file);
    apiFormData.append('isOverlayRequired', 'false');
    apiFormData.append('OCREngine', '2');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'apikey': 'helloworld' },
      body: apiFormData,
    });

    if (!ocrResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'خدمة OCR غير متاحة حالياً. يرجى المحاولة لاحقاً.' },
        { status: 502 }
      );
    }

    const ocrData = await ocrResponse.json();

    if (ocrData.IsErroredOnProcessing) {
      return NextResponse.json(
        { success: false, error: 'فشل معالجة الصورة. تأكد من أن الملف واضح وقابل للقراءة.' },
        { status: 400 }
      );
    }

    const parsedResults = ocrData.ParsedResults || [];
    if (parsedResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'لم يتم العثور على نص قابل للاستخراج.' },
        { status: 400 }
      );
    }

    const allTextParts: string[] = [];
    for (const result of parsedResults) {
      if (result.ParsedText?.trim()) allTextParts.push(result.ParsedText.trim());
    }
    const extractedText = allTextParts.join('\n\n');

    if (!extractedText.trim()) {
      return NextResponse.json(
        { success: false, error: 'لم يتم استخراج أي نص من الملف.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      pages: parsedResults.length,
    });

  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ غير متوقع أثناء استخراج النص.' },
      { status: 500 }
    );
  }
}
