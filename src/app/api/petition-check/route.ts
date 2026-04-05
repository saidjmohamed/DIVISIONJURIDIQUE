import { NextRequest, NextResponse } from "next/server";
import {
  callAI, checkRateLimit, extractJSON,
} from "@/lib/ai-core";

// ═══════════════════════════════════════════════════════════════════════════
// فاحص العرائض القانونية — SSE Streaming v9
// 🧠 Qwen 3.6 Plus → Gemini 2.5 Flash → Gemini 2.0 Flash → Groq
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `أنت فاحص شكلي للعرائض القانونية الجزائرية.
الأساس: قانون الإجراءات الجزائية 25-14 + ق.إ.م.إ 08-09.
فحص شكلي فقط. لا تحلل الموضوع. لا تنشئ وقائع غير موجودة.
أذكر المادة القانونية مع كل ملاحظة.
أجب بـ JSON فقط. لا تضف أي نص قبل أو بعد JSON.`;

const JSON_FORMAT = `{"result":"accepted أو rejected أو needs_review","score":0-100,"documentType":"نوع الوثيقة","court":"المحكمة","date":"التاريخ","summary":"ملخص 3-5 جمل","passedChecks":[{"label":"الشرط","article":"المادة"}],"failedChecks":[{"label":"الشرط","article":"المادة","critical":true,"details":"السبب"}],"pendingChecks":[{"label":"العنصر","reason":"السبب"}],"suggestions":[{"label":"العنصر","suggestion":"الاقتراح"}]}`;

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

function makeReport(r: PetitionCheckResult): string {
  const verdict = r.result === 'accepted' ? '✅ مقبول شكلاً'
    : r.result === 'rejected' ? '❌ مرفوض شكلاً'
    : '⚠️ ناقص شكلاً ويحتاج استكمال';

  let s = `════════════════════════════════════════\n        تقرير الفحص الشكلي\n════════════════════════════════════════\n\n`;
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

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // Rate limiting
  const rl = await checkRateLimit(req, { key: 'petition-check', limit: 10, window: 60 });
  if (rl.limited) {
    return NextResponse.json({ error: rl.errorMessage }, { status: 429 });
  }

  // Parse body
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
  if (text.length > 15000) return NextResponse.json({ error: "النص طويل جداً (حد أقصى 15000 حرف)" }, { status: 400 });

  const docLabel = TYPE_LABELS[documentType] || documentType;
  const cat = { civil: "مدني", admin: "إداري", criminal: "جزائي" }[documentCategory] || "";
  const truncatedText = text.length > 8000 ? text.slice(0, 8000) : text;

  const userMsg = `نوع الوثيقة: ${docLabel} (${cat})

${truncatedText}

أجب بهذا التنسيق JSON بالضبط:
${JSON_FORMAT}`;

  // ─── SSE Stream ───
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); }
        catch { closed = true; }
      };
      const safeClose = () => { if (!closed) { closed = true; try { controller.close(); } catch {} } };

      try {
        send("status", { step: "connecting", message: "جاري الاتصال..." });

        // Qwen 3.6 Plus → Gemini 2.5 Flash → Gemini 2.0 Flash → Groq
        const result = await callAI({
          systemPrompt: SYSTEM_PROMPT,
          userMessage: userMsg,
          requestType: 'legal_analysis',
          temperature: 0.4,
          globalTimeoutMs: 28_000,
        });

        const parsed = result.content ? parseAndValidate(result.content) : null;

        if (parsed) {
          const report = makeReport(parsed);
          send("complete", {
            ...parsed,
            report,
            rawReport: report,
            aiPowered: true,
            model: result.model.id,
            modelLabel: result.model.label,
            tier: result.model.tier,
            triedModels: result.triedModels,
            parseFailed: false,
            executionTime: result.elapsedMs,
          });
        } else if (result.content) {
          // تعذّر تحليل JSON — إخبار المستخدم مباشرة
          const empty = createEmptyResult();
          empty.summary = "تم الاتصال بالنموذج لكن تعذّر تنسيق النتائج. يرجى المحاولة مرة أخرى.";
          send("complete", {
            ...empty,
            report: `⚠️ ${empty.summary}`,
            aiPowered: true,
            model: result.model.id,
            modelLabel: result.model.label,
            tier: result.model.tier,
            triedModels: result.triedModels,
            parseFailed: true,
            executionTime: result.elapsedMs,
          });
        } else {
          // No content at all
          const isTimeout = result.timedOut;
          const empty = createEmptyResult();
          empty.summary = isTimeout
            ? "استغرق التحليل وقتاً أطول من المتوقع. يرجى المحاولة مرة أخرى."
            : "جميع النماذج لم تُرجع رداً. يرجى المحاولة لاحقاً.";

          send(isTimeout ? "timeout" : "error", {
            ...empty,
            report: `⚠️ ${empty.summary}`,
            aiPowered: false,
            model: result.model.id,
            modelLabel: result.model.label,
            tier: result.model.tier,
            triedModels: result.triedModels,
            parseFailed: true,
            executionTime: result.elapsedMs,
            timedOut: isTimeout,
          });
        }

        await new Promise(r => setTimeout(r, 100));
        safeClose();
      } catch (err) {
        console.error("[PetitionCheck] Fatal:", err);
        send("error", { error: "حدث خطأ في التحليل. يرجى المحاولة مرة أخرى." });
        safeClose();
      }
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
