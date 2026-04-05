import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ═══════════════════════════════════════════════════════════════════════════
// ⚡ PERFORMANCE CONFIG — Tuned for sub-10s responses
// ═══════════════════════════════════════════════════════════════════════════

const GLOBAL_TIMEOUT_MS = 14_000;   // Hard cap on entire request
const MAX_MODELS_TO_TRY = 3;        // Max models before giving up
const TIER_0_TIMEOUT = 8_000;       // Primary model: 8s
const TIER_1_TIMEOUT = 6_000;       // Fast fallback: 6s
const TIER_2_TIMEOUT = 6_000;       // Strong fallback: 6s
const MAX_INPUT_CHARS = 8_000;      // Truncate long documents
const CLIENT_TIMEOUT_MS = 20_000;   // Frontend should timeout at 20s

// ═══════════════════════════════════════════════════════════════════════════
// نموذج الرد الصارم
// ═══════════════════════════════════════════════════════════════════════════

interface PetitionCheckResult {
  result: "accepted" | "rejected" | "needs_review";
  score: number;
  documentType: string;
  court: string;
  date: string;
  summary: string;
  passedChecks: Array<{ label: string; article: string }>;
  failedChecks: Array<{ label: string; article: string; critical: boolean; details: string }>;
  pendingChecks: Array<{ label: string; reason: string }>;
  suggestions: Array<{ label: string; suggestion: string }>;
}

function createEmptyResult(): PetitionCheckResult {
  return {
    result: "needs_review", score: 50, documentType: "", court: "", date: "",
    summary: "", passedChecks: [], failedChecks: [], pendingChecks: [], suggestions: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// النماذج — فقط الأسرع والأكثر موثوقية (3 نماذج كحد أقصى)
// ═══════════════════════════════════════════════════════════════════════════

interface PetitionModel { id: string; label: string; tier: number; maxTokens: number; }

const MODELS: PetitionModel[] = [
  // Tier 0: Primary — fast and reliable
  { id: "qwen/qwen3.6-plus:free",                 label: "Qwen 3.6 Plus",        tier: 0, maxTokens: 4096 },
  // Tier 1: Fast fallbacks — lightweight models
  { id: "stepfun/step-3.5-flash:free",            label: "Step 3.5 Flash",        tier: 1, maxTokens: 4096 },
  { id: "openai/gpt-oss-20b:free",                label: "GPT OSS 20B",           tier: 1, maxTokens: 4096 },
  // Tier 2: Strong fallbacks (only if T0+T1 all fail)
  { id: "openai/gpt-oss-120b:free",               label: "GPT OSS 120B",          tier: 2, maxTokens: 4096 },
];

// ═══════════════════════════════════════════════════════════════════════════
// البروميبت — مُختصر لسرعة أسرع
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `أنت فاحص شكلي للعرائض القانونية الجزائرية.
الأساس: قانون الإجراءات الجزائية 25-14 + ق.إ.م.إ 08-09.

قواعد:
- فحص شكلي فقط، لا تحلل الموضوع
- لا تنشئ وقائع غير موجودة
- إذا غير ظاهر ← "غير ظاهر من الملف"
- اذكر المادة القانونية مع كل ملاحظة

ردّ بـ JSON فقط. لا تضف أي نص آخر. أكمل جميع الحقول.`;

const JSON_FORMAT_EXAMPLE = `{
  "result": "accepted|rejected|needs_review",
  "score": 75,
  "documentType": "عريضة افتتاح دعوى",
  "court": "محكمة الجزائر",
  "date": "15 مارس 2026",
  "summary": "ملخص 3-5 جمل",
  "passedChecks": [{"label": "اللغة العربية", "article": "المادة 3"}],
  "failedChecks": [{"label": "بيان الموطن", "article": "المادة 13", "critical": true, "details": "السبب"}],
  "pendingChecks": [{"label": "التبليغ", "reason": "السبب"}],
  "suggestions": [{"label": "الموطن", "suggestion": "أضف..."}]
}`;

// ═══════════════════════════════════════════════════════════════════════════
// أنواع الوثائق
// ═══════════════════════════════════════════════════════════════════════════

const TYPE_LABELS: Record<string, string> = {
  civil_opening: "عريضة افتتاح دعوى مدنية",
  civil_response: "مذكرة جوابية مدنية",
  civil_rejoinder: "مذكرة تعقيبية مدنية",
  civil_formal_challenge: "دفع شكلي مدني",
  civil_incidental: "طلب عارض مدني",
  civil_appeal: "استئناف مدني",
  civil_cassation: "طعن بالنقض مدني",
  admin_initial: "دعوى إدارية",
  admin_appeal: "استئناف إداري",
  crim_complaint: "شكوى عادية",
  crim_civil_claim: "شكوى مع ادعاء مدني",
  crim_direct_claim: "ادعاء مدني",
  crim_misdemeanor_defense: "مذكرة دفاع جنح",
  crim_felony_defense: "مذكرة دفاع جنايات",
  crim_opposition: "معارضة",
  crim_appeal: "استئناف جزائي",
  crim_cassation: "نقض جزائي",
  crim_bail: "طلب إفراج مؤقت",
  crim_indictment_appeal: "تظلم غرفة الاتهام",
  crim_incidental_memo: "مذكرة عارضة",
};

// ═══════════════════════════════════════════════════════════════════════════
// JSON Parser — خفيف وسريع
// ═══════════════════════════════════════════════════════════════════════════

function extractJSON(raw: string): string | null {
  const trimmed = raw.trim();
  // Step 1: Direct parse
  try { JSON.parse(trimmed); return trimmed; } catch {}

  // Step 2: Code block extraction
  const cb = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (cb) { try { JSON.parse(cb[1].trim()); return cb[1].trim(); } catch {} }

  // Step 3: Find outermost balanced {...}
  let depth = 0, start = -1;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (trimmed[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const c = trimmed.substring(start, i + 1);
        try { JSON.parse(c); return c; } catch { start = -1; }
      }
    }
  }

  // Step 4: Fix truncated JSON
  if (start !== -1) {
    let t = trimmed.substring(start);
    t = t.replace(/,\s*"[^"]*"\s*:?\s*$/, '').replace(/,\s*$/, '');
    const ob = (t.match(/\{/g) || []).length - (t.match(/\}/g) || []).length;
    const oa = (t.match(/\[/g) || []).length - (t.match(/\]/g) || []).length;
    t += ']'.repeat(Math.max(0, oa)) + '}'.repeat(Math.max(0, ob));
    try { JSON.parse(t); return t; } catch {}
  }
  return null;
}

function parseAndValidate(raw: string): PetitionCheckResult | null {
  const jsonStr = extractJSON(raw);
  if (!jsonStr) return null;
  try {
    const d = JSON.parse(jsonStr);
    const r = createEmptyResult();
    const vr = ["accepted", "rejected", "needs_review"];

    r.result = vr.includes(d.result) ? d.result : "needs_review";
    r.score = typeof d.score === "number" ? Math.min(100, Math.max(0, d.score)) : 50;
    r.documentType = String(d.documentType || "");
    r.court = String(d.court || "");
    r.date = String(d.date || "");
    r.summary = String(d.summary || "");

    if (Array.isArray(d.passedChecks)) {
      r.passedChecks = d.passedChecks
        .filter((c: unknown) => c && typeof c === "object")
        .map((c: Record<string, unknown>) => ({ label: String(c.label || ""), article: String(c.article || "") }))
        .filter((c: { label: string }) => c.label);
    }
    if (Array.isArray(d.failedChecks)) {
      r.failedChecks = d.failedChecks
        .filter((c: unknown) => c && typeof c === "object")
        .map((c: Record<string, unknown>) => ({
          label: String(c.label || ""), article: String(c.article || ""),
          critical: Boolean(c.critical), details: String(c.details || ""),
        }))
        .filter((c: { label: string }) => c.label);
    }
    if (Array.isArray(d.pendingChecks)) {
      r.pendingChecks = d.pendingChecks
        .filter((c: unknown) => c && typeof c === "object")
        .map((c: Record<string, unknown>) => ({ label: String(c.label || ""), reason: String(c.reason || "") }))
        .filter((c: { label: string }) => c.label);
    }
    if (Array.isArray(d.suggestions)) {
      r.suggestions = d.suggestions
        .filter((c: unknown) => c && typeof c === "object")
        .map((c: Record<string, unknown>) => ({ label: String(c.label || ""), suggestion: String(c.suggestion || "") }))
        .filter((c: { label: string }) => c.label);
    }

    if (!r.summary && r.passedChecks.length === 0 && r.failedChecks.length === 0) return null;

    if (!r.summary) {
      const parts: string[] = [];
      if (r.failedChecks.some(c => c.critical)) parts.push("توجد نواقص شكلية جوهرية");
      else if (r.failedChecks.length > 0) parts.push("توجد نواقص شكلية قابلة للتدارك");
      if (r.passedChecks.length > 0) parts.push(`مع ${r.passedChecks.length} شروط مستوفاة`);
      if (r.pendingChecks.length > 0) parts.push(`${r.pendingChecks.length} عناصر معلقة`);
      r.summary = parts.join("، ") || "تم الفحص الشكلي للمستند.";
    }

    return r;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Report Generator
// ═══════════════════════════════════════════════════════════════════════════

function makeReport(r: PetitionCheckResult): string {
  const verdict = r.result === 'accepted' ? '✅ مقبول شكلاً'
    : r.result === 'rejected' ? '❌ مرفوض شكلاً'
    : '⚠️ ناقص شكلاً ويحتاج استكمال';

  let s = `════════════════════════════════════════\n`;
  s += `        تقرير الفحص الشكلي\n`;
  s += `════════════════════════════════════════\n\n`;
  s += `📄 نوع الوثيقة: ${r.documentType || 'غير محدد'}\n`;
  s += `⚖️ الجهة القضائية: ${r.court || 'غير ظاهرة'}\n`;
  s += `📅 التاريخ: ${r.date || 'غير مذكور'}\n\n`;
  s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  s += `🎯 النتيجة: ${verdict}\n📊 الدرجة: ${r.score}/100\n\n`;

  if (r.summary) { s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📝 الملخص:\n${r.summary}\n\n`; }
  if (r.passedChecks.length > 0) {
    s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ الشروط المستوفاة (${r.passedChecks.length}):\n`;
    for (const c of r.passedChecks) s += `   • ${c.label} — ${c.article}\n`;
    s += '\n';
  }
  if (r.failedChecks.length > 0) {
    s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n❌ الشروط غير المستوفاة (${r.failedChecks.length}):\n`;
    for (const c of r.failedChecks) {
      s += `   • ${c.label} — ${c.critical ? '🔴 جوهري' : '🟡 قابل للتدارك'}\n`;
      s += `     المادة: ${c.article}\n`;
      if (c.details) s += `     التفاصيل: ${c.details}\n`;
    }
    s += '\n';
  }
  if (r.pendingChecks.length > 0) {
    s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔍 فحوص معلّقة (${r.pendingChecks.length}):\n`;
    for (const c of r.pendingChecks) s += `   • ${c.label} — ${c.reason}\n`;
    s += '\n';
  }
  if (r.suggestions.length > 0) {
    s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✏️ اقتراحات التنقيح الشكلي (${r.suggestions.length}):\n`;
    for (const c of r.suggestions) s += `   • ${c.label} → ${c.suggestion}\n`;
    s += '\n';
  }
  s += `══════════════════════════════════════\n`;
  s += `⚠️ تنبيه: هذا للفحص الشكلي الأولي ولا يغني عن مراجعة المحامي المختص.\n`;
  s += `🔒 الخصوصية: لا تُحفظ أي بيانات بعد انتهاء الفحص.\n`;
  s += `══════════════════════════════════════`;
  return s;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI Call — with per-model timeout + global abort signal
// ═══════════════════════════════════════════════════════════════════════════

async function callModel(
  systemPrompt: string,
  userMessage: string,
  model: PetitionModel,
  globalSignal: AbortSignal,
): Promise<{ content: string | null; model: PetitionModel; elapsed: number }> {
  const timeout = model.tier === 0 ? TIER_0_TIMEOUT : model.tier === 1 ? TIER_1_TIMEOUT : TIER_2_TIMEOUT;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  // Link global abort to per-model abort
  const onGlobalAbort = () => { controller.abort(); };
  globalSignal.addEventListener("abort", onGlobalAbort, { once: true });

  const startMs = Date.now();

  const cleanup = () => {
    clearTimeout(timer);
    globalSignal.removeEventListener("abort", onGlobalAbort);
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hiyaat-dz.vercel.app",
        "X-Title": "Shamil DZ - Legal Checker",
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: model.maxTokens,
        temperature: 0.15,
      }),
      signal: controller.signal,
    });

    // DON'T clear timer here — body read (res.json) can also hang
    const elapsed = Date.now() - startMs;
    console.log(`[PetitionCheck] ${model.label}: ${res.status} headers in ${elapsed}ms`);

    if (!res.ok) {
      cleanup();
      return { content: null, model, elapsed };
    }

    // Body read — this is where models can hang generating tokens
    const data = await res.json();
    cleanup();

    const totalElapsed = Date.now() - startMs;
    console.log(`[PetitionCheck] ${model.label}: complete in ${totalElapsed}ms`);

    const content = data?.choices?.[0]?.message?.content?.trim();
    return { content: content && content.length > 20 ? content : null, model, elapsed: totalElapsed };
  } catch (err) {
    cleanup();
    const elapsed = Date.now() - startMs;
    const reason = err instanceof Error && err.name === 'AbortError'
      ? 'TIMEOUT' : err instanceof Error ? err.message : 'ERROR';
    console.log(`[PetitionCheck] ${model.label}: ${reason} in ${elapsed}ms`);
    return { content: null, model, elapsed };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API Route — Streaming SSE for real-time progress
// ═══════════════════════════════════════════════════════════════════════════

export const maxDuration = 30; // Reduced from 60 — we don't need more

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: "مفتاح OpenRouter غير مضبوط" }, { status: 500 });
  }

  // Rate limiting
  const ip = getClientIp(req);
  const { limited } = await rateLimit({ key: 'petition-check', identifier: ip, limit: 10, window: 60 });
  if (limited) {
    return NextResponse.json({ error: "تجاوزت الحد المسموح. انتظر دقيقة ثم حاول." }, { status: 429 });
  }

  // ─── Parse request body ───
  let text: string, documentType: string, documentCategory: string;
  try {
    const body = await req.json();
    text = body.text?.trim() || "";
    documentType = body.documentType;
    documentCategory = body.documentCategory;
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  if (!text) return NextResponse.json({ error: "النص فارغ" }, { status: 400 });
  if (!documentType) return NextResponse.json({ error: "اختر نوع الوثيقة" }, { status: 400 });
  if (text.length > 15000) {
    return NextResponse.json({ error: "النص طويل جداً. الحد الأقصى 15000 حرف." }, { status: 400 });
  }

  // ─── Global timeout — hard cap ───
  const globalController = new AbortController();
  const globalTimer = setTimeout(() => globalController.abort(), GLOBAL_TIMEOUT_MS);

  const docLabel = TYPE_LABELS[documentType] || documentType;
  const cat = { civil: "مدني", admin: "إداري", criminal: "جزائي" }[documentCategory] || "";

  // Truncate input to max chars for speed
  const truncatedText = text.length > MAX_INPUT_CHARS
    ? text.slice(0, MAX_INPUT_CHARS)
    : text;

  const userMsg = `نوع الوثيقة: ${docLabel} (${cat})

محتوى الوثيقة:
${truncatedText}

JSON المطلوب:
${JSON_FORMAT_EXAMPLE}

ردك يجب أن يكون JSON صالح فقط.`;

  // ─── SSE Stream ───
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const sendError = (message: string) => {
        send("error", { error: message });
        controller.close();
      };

      try {
        const startTime = Date.now();
        const tried: string[] = [];
        let parsedResult: PetitionCheckResult | null = null;
        let usedModel = MODELS[0];

        // Notify: analysis started
        send("status", { step: "connecting", message: "جاري الاتصال بنموذج الذكاء الاصطناعي..." });

        // Try models with limit
        for (let i = 0; i < MODELS.length && i < MAX_MODELS_TO_TRY; i++) {
          if (globalController.signal.aborted) {
            send("status", { step: "timeout", message: "تجاوز الوقت المسموح" });
            break;
          }

          const m = MODELS[i];
          tried.push(m.id);

          send("status", {
            step: "analyzing",
            message: `جاري التحليل بواسطة ${m.label}...`,
            model: m.label,
            attempt: i + 1,
            maxAttempts: MAX_MODELS_TO_TRY,
          });

          const { content, model, elapsed } = await callModel(
            SYSTEM_PROMPT, userMsg, m, globalController.signal,
          );

          if (!content) continue;

          console.log(`[PetitionCheck] ${m.id} → ${content.length} chars in ${elapsed}ms`);

          // Try to parse
          const parsed = parseAndValidate(content);
          if (parsed) {
            parsedResult = parsed;
            usedModel = model;
            break;
          }

          // Retry Tier 0 once with stricter instruction
          if (m.tier === 0) {
            console.log(`[PetitionCheck] Retrying ${m.id}...`);
            send("status", { step: "retrying", message: "إعادة المحاولة بتعليمات أوضح..." });

            const retryMsg = userMsg + "\n\n⚠️ ردك لم يكن JSON صالح. أعد الرد بكائن JSON واحد فقط. لا شيء قبله أو بعده.";
            const retry = await callModel(SYSTEM_PROMPT, retryMsg, m, globalController.signal);

            if (retry.content) {
              const retryParsed = parseAndValidate(retry.content);
              if (retryParsed) {
                parsedResult = retryParsed;
                usedModel = model;
                break;
              }
            }
          }
        }

        clearTimeout(globalTimer);
        const totalTime = Date.now() - startTime;

        console.log(`[PetitionCheck] Total: ${totalTime}ms, Models tried: ${tried.length}, Parsed: ${!!parsedResult}`);

        // Build result
        if (parsedResult) {
          const report = makeReport(parsedResult);
          send("complete", {
            ...parsedResult,
            report,
            rawReport: report,
            aiPowered: true,
            model: usedModel.id,
            modelLabel: usedModel.label,
            tier: usedModel.tier,
            triedModels: tried,
            parseFailed: false,
            executionTime: totalTime,
          });
        } else {
          // Timeout or all models failed
          const isTimeout = globalController.signal.aborted;
          const empty = createEmptyResult();
          empty.summary = isTimeout
            ? "استغرق التحليل وقتاً أطول من المتوقع. يرجى تقصير النص والمحاولة مرة أخرى."
            : "تم الاتصال بالذكاء الاصطناعي لكن تعذّر تنسيق النتائج. يرجى المحاولة مرة أخرى.";

          send(isTimeout ? "timeout" : "complete", {
            ...empty,
            report: `⚠️ ${empty.summary}`,
            aiPowered: !isTimeout,
            model: usedModel.id,
            modelLabel: usedModel.label,
            tier: usedModel.tier,
            triedModels: tried,
            parseFailed: true,
            executionTime: totalTime,
            timedOut: isTimeout,
          });
        }

        controller.close();
      } catch (err) {
        clearTimeout(globalTimer);
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[PetitionCheck] Fatal: ${msg}`);
        sendError("حدث خطأ في التحليل. يرجى المحاولة مرة أخرى.");
        controller.close();
      }
    },
    cancel() {
      // Clean up resources when client disconnects mid-stream
      clearTimeout(globalTimer);
      globalController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering (for proxy setups)
    },
  });
}
