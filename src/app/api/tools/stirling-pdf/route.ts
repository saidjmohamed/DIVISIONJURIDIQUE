import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 10;

const OPERATIONS = {
  merge: '/api/v1/general/merge-pdfs',
  split: '/api/v1/general/split-pages',
  compress: '/api/v1/misc/compress-pdf',
  ocr: '/api/v1/misc/ocr-pdf',
} as const;

type Operation = keyof typeof OPERATIONS;

function getErrorMessage(status: number, body: string) {
  if (status === 401 || status === 403) return 'تعذر الوصول إلى خدمة Stirling-PDF. تحقق من مفتاح API.';
  if (status === 413) return 'الملف كبير جدًا بالنسبة لخدمة PDF.';
  if (status >= 500) return 'حدث خطأ داخل خادم Stirling-PDF.';
  return body || 'فشلت معالجة ملف PDF.';
}

export async function GET() {
  const serviceUrl = process.env.STIRLING_PDF_URL;
  if (!serviceUrl) {
    return NextResponse.json({ configured: false, ok: false }, { status: 503 });
  }

  try {
    const response = await fetch(
      `${serviceUrl.replace(/\/$/, '')}/`,
      {
        headers: process.env.STIRLING_PDF_API_KEY
          ? { 'X-API-KEY': process.env.STIRLING_PDF_API_KEY }
          : undefined,
        cache: 'no-store',
      },
    );

    return NextResponse.json(
      { configured: true, ok: response.ok, status: response.status },
      { status: response.ok ? 200 : 503 },
    );
  } catch {
    return NextResponse.json({ configured: true, ok: false }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const serviceUrl = process.env.STIRLING_PDF_URL?.trim();
  if (!serviceUrl) {
    return NextResponse.json(
      { error: 'خدمة Stirling-PDF غير مهيأة. أضف STIRLING_PDF_URL إلى متغيرات البيئة.' },
      { status: 503 },
    );
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'يجب إرسال الملفات بصيغة multipart/form-data.' }, { status: 400 });
  }

  const formData = await request.formData();
  const operation = String(formData.get('operation') || '') as Operation;

  if (!Object.prototype.hasOwnProperty.call(OPERATIONS, operation)) {
    return NextResponse.json({ error: 'عملية PDF غير مدعومة.' }, { status: 400 });
  }

  const files = formData
    .getAll('files')
    .filter((value): value is File => value instanceof File);

  if (!files.length) {
    return NextResponse.json({ error: 'يرجى اختيار ملف PDF واحد على الأقل.' }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `الحد الأقصى هو ${MAX_FILES} ملفات في العملية الواحدة.` }, { status: 400 });
  }

  for (const file of files) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: `الملف «${file.name}» ليس PDF.` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `الملف «${file.name}» يتجاوز حد 50 ميغابايت.` }, { status: 413 });
    }
  }

  if (operation === 'merge' && files.length < 2) {
    return NextResponse.json({ error: 'لدمج ملفات PDF اختر ملفين على الأقل.' }, { status: 400 });
  }

  if (operation !== 'merge' && files.length !== 1) {
    return NextResponse.json({ error: 'هذه العملية تتطلب ملف PDF واحدًا فقط.' }, { status: 400 });
  }

  const pipelineParameters: Record<string, unknown> = {};

  if (operation === 'split') {
    const pageNumbers = String(formData.get('pageNumbers') || '').trim();
    if (!pageNumbers) {
      return NextResponse.json({ error: 'أدخل أرقام الصفحات المراد تقسيمها، مثل: 3 أو 2,5,8.' }, { status: 400 });
    }
    pipelineParameters.pageNumbers = pageNumbers;
  }

  if (operation === 'compress') {
    const level = Number(formData.get('optimizeLevel') || 5);
    pipelineParameters.optimizeLevel = Math.min(9, Math.max(1, Number.isFinite(level) ? level : 5));
  }

  if (operation === 'ocr') {
    pipelineParameters.languages = ['ara'];
    pipelineParameters.ocrType = 'skip-text';
    pipelineParameters.ocrRenderType = 'hocr';
    pipelineParameters.deskew = true;
    pipelineParameters.clean = false;
    pipelineParameters.cleanFinal = false;
    pipelineParameters.sidecar = false;
  }

  const pipeline = {
    name: `Lawyer Tools - ${operation}`,
    pipeline: [
      {
        operation: OPERATIONS[operation],
        parameters: pipelineParameters,
      },
    ],
  };

  const upstream = new FormData();
  for (const file of files) {
    upstream.append('fileInput', file, file.name);
  }
  upstream.append('json', JSON.stringify(pipeline));

  try {
    const response = await fetch(
      `${serviceUrl.replace(/\/$/, '')}/api/v1/pipeline/handleData`,
      {
        method: 'POST',
        headers: process.env.STIRLING_PDF_API_KEY
          ? { 'X-API-KEY': process.env.STIRLING_PDF_API_KEY }
          : undefined,
        body: upstream,
        cache: 'no-store',
      },
    );

    const buffer = await response.arrayBuffer();

    if (!response.ok) {
      const body = new TextDecoder().decode(buffer).slice(0, 1000);
      return NextResponse.json(
        { error: getErrorMessage(response.status, body) },
        { status: response.status },
      );
    }

    if (!buffer.byteLength) {
      return NextResponse.json(
        { error: 'عاد رد فارغ من Stirling-PDF. تحقق من تفعيل أداة Automate/Pipeline في الخادم.' },
        { status: 502 },
      );
    }

    const contentTypeOut = response.headers.get('content-type') || 'application/pdf';
    const disposition = response.headers.get('content-disposition');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypeOut,
        'Content-Disposition':
          disposition || `attachment; filename="lawyer-tools-${operation}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Stirling PDF proxy error:', error);
    return NextResponse.json(
      { error: 'تعذر الاتصال بخدمة Stirling-PDF. تحقق من عنوان الخادم ومفتاح API.' },
      { status: 502 },
    );
  }
}
