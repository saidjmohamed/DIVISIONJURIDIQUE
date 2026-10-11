import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ai-core";
import { getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const LOCAL_WINDOW_MS = 60_000;
const LOCAL_LIMIT = 3;
const localAttempts = new Map<string, { count: number; resetAt: number }>();

function isLocallyRateLimited(ip: string): boolean {
  const now = Date.now();
  if (localAttempts.size > 1000) {
    for (const [key, value] of localAttempts) {
      if (value.resetAt <= now) localAttempts.delete(key);
    }
  }

  const current = localAttempts.get(ip);
  if (!current || current.resetAt <= now) {
    localAttempts.set(ip, { count: 1, resetAt: now + LOCAL_WINDOW_MS });
    return false;
  }
  if (current.count >= LOCAL_LIMIT) return true;
  current.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  // Only accept browser requests originating from this same deployment.
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) {
    return NextResponse.json({ error: "مصدر الطلب غير مسموح." }, { status: 403 });
  }

  const ip = getClientIp(req);
  if (isLocallyRateLimited(ip)) {
    return NextResponse.json(
      { error: "تجاوزت الحد المؤقت للتحويلات. انتظر دقيقة ثم أعد المحاولة." },
      { status: 429 },
    );
  }

  const rateLimit = await checkRateLimit(req, {
    key: "mistral-pdf-to-markdown",
    limit: 3,
    window: 60,
  });
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: rateLimit.errorMessage || "تجاوزت الحد المسموح. حاول لاحقًا." },
      { status: 429 },
    );
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "الخدمة غير مهيأة بعد. أضف MISTRAL_API_KEY في متغيرات البيئة على Vercel." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "تعذر قراءة الملف المرسل." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "اختر ملف PDF أولًا." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "الصيغة المدعومة هي PDF فقط." }, { status: 415 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "الملف فارغ." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "حجم الملف يتجاوز 4 ميغابايت. قلّص حجم PDF ثم أعد المحاولة." },
      { status: 413 },
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "تعذر قراءة محتوى PDF." }, { status: 400 });
  }

  const signature = String.fromCharCode(...bytes.slice(0, 5));
  if (signature !== "%PDF-") {
    return NextResponse.json({ error: "الملف لا يبدو ملف PDF صالحًا." }, { status: 415 });
  }

  const base64 = Buffer.from(bytes).toString("base64");
  try {
    const upstream = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${apiKey}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: {
          type: "document_url",
          document_url: \`data:application/pdf;base64,\${base64}\`,
        },
        include_image_base64: false,
        include_blocks: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });

    if (!upstream.ok) {
      if (upstream.status === 401 || upstream.status === 403) {
        return NextResponse.json(
          { error: "رفضت Mistral المفتاح. تحقق من MISTRAL_API_KEY في إعدادات Vercel." },
          { status: 502 },
        );
      }
      if (upstream.status === 429) {
        return NextResponse.json(
          { error: "وصلت خدمة Mistral إلى حد الطلبات أو الرصيد المتاح. حاول لاحقًا." },
          { status: 429 },
        );
      }
      if (upstream.status === 413) {
        return NextResponse.json(
          { error: "رفضت Mistral حجم المستند. جرّب ملفًا أصغر." },
          { status: 413 },
        );
      }
      return NextResponse.json(
        { error: "تعذر تحويل الملف عبر Mistral. تحقق من PDF ثم أعد المحاولة." },
        { status: 502 },
      );
    }

    const payload = await upstream.json() as {
      model?: string;
      pages?: Array<{ index?: number; markdown?: string }>;
    };
    const pages = Array.isArray(payload.pages) ? payload.pages : [];
    const markdown = pages
      .map((page, index) => {
        const pageText = typeof page.markdown === "string" ? page.markdown.trim() : "";
        if (!pageText) return "";
        const pageNumber = Number.isInteger(page.index) ? Number(page.index) + 1 : index + 1;
        return \`<!-- الصفحة \${pageNumber} -->\\n\\n\${pageText}\`;
      })
      .filter(Boolean)
      .join("\\n\\n---\\n\\n");

    if (!markdown) {
      return NextResponse.json(
        { error: "لم يُرجع Mistral نصًا قابلًا للتحويل من هذا الملف." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      markdown,
      pages: pages.length,
      characters: markdown.length,
      model: payload.model || "mistral-ocr-latest",
      filename: file.name.replace(/\\.pdf$/i, "") + ".md",
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      {
        error: isTimeout
          ? "استغرق التحويل وقتًا أطول من المسموح. جرّب تقسيم الملف إلى أجزاء أصغر."
          : "حدث خطأ أثناء الاتصال بخدمة Mistral. حاول مرة أخرى.",
      },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
