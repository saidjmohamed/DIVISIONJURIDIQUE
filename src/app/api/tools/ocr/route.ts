import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function GET() {
  const serviceUrl = process.env.OCR_SERVICE_URL;
  if (!serviceUrl) {
    return NextResponse.json({ configured: false, ok: false }, { status: 503 });
  }

  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/health`, {
      headers: process.env.OCR_SERVICE_TOKEN
        ? { Authorization: `Bearer ${process.env.OCR_SERVICE_TOKEN}` }
        : undefined,
      cache: 'no-store',
    });
    return NextResponse.json({ configured: true, ok: response.ok }, { status: response.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ configured: true, ok: false }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const serviceUrl = process.env.OCR_SERVICE_URL;
  if (!serviceUrl) {
    return NextResponse.json(
      { error: 'خدمة OCR غير مهيأة. أضف OCR_SERVICE_URL إلى متغيرات البيئة.' },
      { status: 503 },
    );
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'يجب إرسال ملف PDF بصيغة multipart/form-data.' }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'لم يتم إرسال ملف PDF.' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'الملف يجب أن يكون PDF.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'الحد الأقصى للرفع من الواجهة هو 20 ميغابايت حالياً.' }, { status: 413 });
  }

  const upstream = new FormData();
  upstream.append('file', file, file.name);

  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/ocr`, {
      method: 'POST',
      headers: process.env.OCR_SERVICE_TOKEN
        ? { Authorization: `Bearer ${process.env.OCR_SERVICE_TOKEN}` }
        : undefined,
      body: upstream,
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({ error: 'استجابة غير صالحة من خدمة OCR.' }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('OCR proxy error:', error);
    return NextResponse.json(
      { error: 'تعذر الاتصال بخدمة OCR. تأكد من تشغيل خدمة PaddleOCR.' },
      { status: 502 },
    );
  }
}
