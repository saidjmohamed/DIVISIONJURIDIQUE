import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ═══════════════════════════════════════════════════════════════════════════
// نموذج الرد الصارم — يُستخدم للتحقق من صحة مخرجات الذكاء الاصطناعي
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
    result: "needs_review",
    score: 50,
    documentType: "",
    court: "",
    date: "",
    summary: "",
    passedChecks: [],
    failedChecks: [],
    pendingChecks: [],
    suggestions: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// النماذج — Qwen3.6 Plus رئيسي مع fallback
// ═══════════════════════════════════════════════════════════════════════════

interface PetitionModel { id: string; label: string; tier: number; maxTokens: number; }
const MODELS: PetitionModel[] = [
  { id: "qwen/qwen3.6-plus:free",                 label: "Qwen 3.6 Plus",        tier: 0, maxTokens: 8192 },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free",    label: "Nemotron Nano 30B",    tier: 1, maxTokens: 4096 },
  { id: "openai/gpt-oss-20b:free",                label: "GPT OSS 20B",           tier: 1, maxTokens: 4096 },
  { id: "arcee-ai/trinity-mini:free",             label: "Trinity Mini",          tier: 1, maxTokens: 4096 },
  { id: "stepfun/step-3.5-flash:free",            label: "Step 3.5 Flash",        tier: 1, maxTokens: 4096 },
  { id: "openai/gpt-oss-120b:free",               label: "GPT OSS 120B",          tier: 2, maxTokens: 6144 },
  { id: "qwen/qwen3-coder:free",                  label: "Qwen3 Coder",           tier: 2, maxTokens: 6144 },
  { id: "google/gemma-3-27b-it:free",             label: "Gemma 3 27B",           tier: 3, maxTokens: 4096 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B",        tier: 3, maxTokens: 4096 },
  { id: "minimax/minimax-m2.5:free",              label: "MiniMax M2.5",          tier: 3, maxTokens: 4096 },
];

// ═══════════════════════════════════════════════════════════════════════════
// البروميبت — صارم ومنظّم لإجبار JSON خالص
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `أنت فاحص شكلي متخصص للعرائض والمحررات القانونية الجزائرية.

## الأساس القانوني:
- القانون رقم 25-14 المؤرخ في 3 غشت 2025 (قانون الإجراءات الجزائية الجديد)
- الأمر رقم 08-09 المؤرخ في 25 فبراير 2008 (قانون الإجراءات المدنية والإدارية) وتعديلاته

## قواعد الفحص الصارمة:
1. فحصك شكلي فقط — لا تحلل الموضوع ولا تقدّر فرص النجاح
2. لا تصف الدفوع بأنها قوية أو ضعيفة
3. لا تنشئ وقائع غير موجودة في النص
4. إذا كان عنصر غير ظاهر ← اكتب "غير ظاهر من الملف"
5. إذا تعذّر التحقق ← صنّفه في pendingChecks
6. اذكر رقم المادة القانونية مع كل ملاحظة
7. لغة قانونية مهنية واضحة

## الشروط الشكلية المطلوب فحصها:
- اللغة العربية (جوهري)
- تاريخ التحرير
- عنوان/تسمية المحرر
- تحديد الجهة القضائية (جوهري)
- هوية الأطراف الكاملة: اسم، لقب، موطن (جوهري)
- صفة الشخص المعنوي ومقره وممثله عند الاقتضاء (جوهري)
- عرض موجز للوقائع
- الطلبات أو أوجه الطعن (جوهري)
- الإشارة للمرفقات إن ذُكرت
- التوقيع وبيان اسم المحامي
- التمثيل بمحامٍ حيث يكون وجوبياً (جوهري)

## مستويات النتيجة:
- accepted: جميع الشروط الجوهرية متوفرة
- rejected: نقص جوهري صريح
- needs_review: نقص قابل للتدارك أو غامض

## تنسيق الرد المطلوب:
يجب أن ترد بـ JSON فقط. لا تضف أي نص قبله أو بعده. لا تستخدم markdown. لا تكتب أي شرح.
أكمل جميع الحقول دون استثناء.`;

const JSON_FORMAT_EXAMPLE = `{
  "result": "accepted أو rejected أو needs_review",
  "score": 75,
  "documentType": "عريضة افتتاح دعوى مدنية",
  "court": "محكمة الجزائر المركزية",
  "date": "15 مارس 2026",
  "summary": "ملخص من 3-5 جمل يوضح الحالة الشكلية العامة",
  "passedChecks": [
    {"label": "اللغة العربية", "article": "المادة 3 ق.إ.م.إ"}
  ],
  "failedChecks": [
    {"label": "بيان موطن المدعى عليه", "article": "المادة 13 ق.إ.م.إ", "critical": true, "details": "لم يُذكر موطن المدعى عليه في العريضة وهو شرط جوهري للقبول"}
  ],
  "pendingChecks": [
    {"label": "التبليغ الصحيح", "reason": "يتعذر التحقق من تاريخ التبليغ دون مرفقات"}
  ],
  "suggestions": [
    {"label": "بيان الموطن", "suggestion": "أضف بيان موطن المدعى عليه كاملاً في بند هوية الأطراف"}
  ]
}`;

// ═══════════════════════════════════════════════════════════════════════════
// أنواع الوثائق مع المواد القانونية
// ═══════════════════════════════════════════════════════════════════════════

const TYPE_LABELS: Record<string, string> = {
  civil_opening: "عريضة افتتاح دعوى مدنية (المواد 13-17 ق.إ.م.إ)",
  civil_response: "مذكرة جوابية (المواد 25-27 ق.إ.م.إ)",
  civil_rejoinder: "مذكرة تعقيبية (المواد 25-27 ق.إ.م.إ)",
  civil_formal_challenge: "دفع شكلي (المواد 50-54 ق.إ.م.إ)",
  civil_incidental: "طلب عارض (المواد 28-30 ق.إ.م.إ)",
  civil_appeal: "استئناف مدني (المواد 325-340 ق.إ.م.إ)",
  civil_cassation: "طعن بالنقض مدني (المواد 349-354 ق.إ.م.إ)",
  admin_initial: "دعوى إدارية (المواد 800-804 ق.إ.م.إ)",
  admin_appeal: "استئناف إداري (المواد 904-911 ق.إ.م.إ)",
  crim_complaint: "شكوى عادية (المواد 17, 26 ق.إ.ج 25-14)",
  crim_civil_claim: "شكوى مع ادعاء مدني (المواد 72-75 ق.إ.ج 25-14)",
  crim_direct_claim: "ادعاء مدني (المواد 2-4 ق.إ.ج 25-14)",
  crim_misdemeanor_defense: "دفاع جنح (المواد 340-383 ق.إ.ج 25-14)",
  crim_felony_defense: "دفاع جنايات (المواد 340-383 ق.إ.ج 25-14)",
  crim_opposition: "معارضة (المواد 398-401 ق.إ.ج 25-14)",
  crim_appeal: "استئناف جزائي (المواد 414-419 ق.إ.ج 25-14)",
  crim_cassation: "نقض جزائي (المواد 495-500 ق.إ.ج 25-14)",
  crim_bail: "إفراج مؤقت (المواد 123-127 ق.إ.ج 25-14)",
  crim_indictment_appeal: "تظلم غرفة الاتهام (المواد 175-177 ق.إ.ج 25-14)",
  crim_incidental_memo: "مذكرة عارضة (المواد 344-348 ق.إ.ج 25-14)",
};

// ═══════════════════════════════════════════════════════════════════════════
// JSON Parser — قوي مع معالجة الأخطاء
// ═══════════════════════════════════════════════════════════════════════════

function extractJSON(raw: string): string | null {
  // Step 1: Direct parse
  const trimmed = raw.trim();
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch { /* continue */ }

  // Step 2: Extract from markdown code blocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    try {
      JSON.parse(inner);
      return inner;
    } catch { /* continue */ }
  }

  // Step 3: Find outermost {...} — handle nested braces
  let depth = 0;
  let start = -1;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (trimmed[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const candidate = trimmed.substring(start, i + 1);
        try {
          JSON.parse(candidate);
          return candidate;
        } catch { /* continue searching */ }
        start = -1;
      }
    }
  }

  // Step 4: Try to fix truncated JSON — close open brackets
  if (start !== -1) {
    let truncated = trimmed.substring(start);
    // Count unclosed brackets and arrays
    const openBraces = (truncated.match(/\{/g) || []).length;
    const closeBraces = (truncated.match(/\}/g) || []).length;
    const openBrackets = (truncated.match(/\[/g) || []).length;
    const closeBrackets = (truncated.match(/\]/g) || []).length;
    // Remove trailing incomplete key/value
    truncated = truncated.replace(/,\s*"[^"]*"\s*:?\s*$/, '');
    truncated = truncated.replace(/,\s*$/, '');
    // Close remaining open structures
    truncated += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
    truncated += '}'.repeat(Math.max(0, openBraces - closeBraces));
    try {
      JSON.parse(truncated);
      return truncated;
    } catch { /* give up */ }
  }

  return null;
}

function parseAndValidate(raw: string): PetitionCheckResult | null {
  const jsonStr = extractJSON(raw);
  if (!jsonStr) return null;

  try {
    const data = JSON.parse(jsonStr);

    // Validate required fields
    const result = createEmptyResult();
    const validResults = ["accepted", "rejected", "needs_review"];

    result.result = validResults.includes(data.result) ? data.result : "needs_review";
    result.score = typeof data.score === "number" ? Math.min(100, Math.max(0, data.score)) : 50;
    result.documentType = typeof data.documentType === "string" ? data.documentType : "";
    result.court = typeof data.court === "string" ? data.court : "";
    result.date = typeof data.date === "string" ? data.date : "";
    result.summary = typeof data.summary === "string" ? data.summary : "";

    // Validate passedChecks
    if (Array.isArray(data.passedChecks)) {
      result.passedChecks = data.passedChecks
        .filter((c: unknown) => c && typeof c === "object")
        .map((c: Record<string, unknown>) => ({
          label: String(c.label || ""),
          article: String(c.article || ""),
        }))
        .filter((c: { label: string }) => c.label);
    }

    // Validate failedChecks
    if (Array.isArray(data.failedChecks)) {
      result.failedChecks = data.failedChecks
        .filter((c: unknown) => c && typeof c === "object")
        .map((c: Record<string, unknown>) => ({
          label: String(c.label || ""),
          article: String(c.article || ""),
          critical: Boolean(c.critical),
          details: String(c.details || ""),
        }))
        .filter((c: { label: string }) => c.label);
    }

    // Validate pendingChecks
    if (Array.isArray(data.pendingChecks)) {
      result.pendingChecks = data.pendingChecks
        .filter((c: unknown) => c && typeof c === "object")
        .map((c: Record<string, unknown>) => ({
          label: String(c.label || ""),
          reason: String(c.reason || ""),
        }))
        .filter((c: { label: string }) => c.label);
    }

    // Validate suggestions
    if (Array.isArray(data.suggestions)) {
      result.suggestions = data.suggestions
        .filter((c: unknown) => c && typeof c === "object")
        .map((c: Record<string, unknown>) => ({
          label: String(c.label || ""),
          suggestion: String(c.suggestion || ""),
        }))
        .filter((c: { label: string }) => c.label);
    }

    // At minimum we need a summary and some checks
    if (!result.summary && result.passedChecks.length === 0 && result.failedChecks.length === 0) {
      return null; // Truly empty response
    }

    // Auto-generate summary if missing
    if (!result.summary) {
      const parts: string[] = [];
      if (result.failedChecks.some(c => c.critical)) {
        parts.push("توجد نواقص شكلية جوهرية");
      } else if (result.failedChecks.length > 0) {
        parts.push("توجد نواقص شكلية قابلة للتدارك");
      }
      if (result.passedChecks.length > 0) {
        parts.push(`مع ${result.passedChecks.length} شروط مستوفاة`);
      }
      if (result.pendingChecks.length > 0) {
        parts.push(`${result.pendingChecks.length} عناصر معلقة`);
      }
      result.summary = parts.join("، ") || "تم الفحص الشكلي للمستند.";
    }

    return result;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Report Generator — تقرير نصي منظم
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
  s += `🎯 النتيجة: ${verdict}\n`;
  s += `📊 الدرجة: ${r.score}/100\n\n`;

  if (r.summary) {
    s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    s += `📝 الملخص:\n${r.summary}\n\n`;
  }

  if (r.passedChecks.length > 0) {
    s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    s += `✅ الشروط المستوفاة (${r.passedChecks.length}):\n`;
    for (const c of r.passedChecks) s += `   • ${c.label} — ${c.article}\n`;
    s += '\n';
  }

  if (r.failedChecks.length > 0) {
    s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    s += `❌ الشروط غير المستوفاة (${r.failedChecks.length}):\n`;
    for (const c of r.failedChecks) {
      s += `   • ${c.label} — ${c.critical ? '🔴 جوهري' : '🟡 قابل للتدارك'}\n`;
      s += `     المادة: ${c.article}\n`;
      if (c.details) s += `     التفاصيل: ${c.details}\n`;
    }
    s += '\n';
  }

  if (r.pendingChecks.length > 0) {
    s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    s += `🔍 فحوص معلّقة (${r.pendingChecks.length}):\n`;
    for (const c of r.pendingChecks) s += `   • ${c.label} — ${c.reason}\n`;
    s += '\n';
  }

  if (r.suggestions.length > 0) {
    s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    s += `✏️ اقتراحات التنقيح الشكلي (${r.suggestions.length}):\n`;
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
// API Route
// ═══════════════════════════════════════════════════════════════════════════

export const maxDuration = 60;

async function callModel(
  systemPrompt: string,
  userMessage: string,
  model: PetitionModel,
): Promise<{ content: string | null; model: PetitionModel }> {
  const timeout = model.tier === 0 ? 25000 : model.tier === 1 ? 12000 : model.tier === 2 ? 15000 : 8000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

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
        temperature: 0.2, // Low for more deterministic output
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return { content: null, model };

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return { content: content?.trim() || null, model };
  } catch {
    clearTimeout(timer);
    return { content: null, model };
  }
}

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: "مفتاح OpenRouter غير مضبوط" }, { status: 500 });
  }

  // Rate limiting
  const ip = getClientIp(req);
  const { limited } = await rateLimit({ key: 'petition-check', identifier: ip, limit: 10, window: 60 });
  if (limited) {
    return NextResponse.json({ error: "تجاوزت الحد المسموح من الفحوص. انتظر دقيقة ثم حاول مرة أخرى." }, { status: 429 });
  }

  try {
    const { text, documentType, documentCategory } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "النص فارغ" }, { status: 400 });
    if (!documentType) return NextResponse.json({ error: "اختر نوع الوثيقة" }, { status: 400 });
    if (text.length > 15000) {
      return NextResponse.json({ error: "النص طويل جداً. الحد الأقصى 15000 حرف." }, { status: 400 });
    }

    const docLabel = TYPE_LABELS[documentType] || documentType;
    const cat = { civil: "مدني", admin: "إداري", criminal: "جزائي" }[documentCategory] || "";

    // ✅ FIX: Send full text (up to 12000 chars), not truncated to 5000
    const userMsg = `## نوع الوثيقة: ${docLabel}
## القسم: ${cat}

## محتوى الوثيقة:
${text.slice(0, 12000)}

## تنسيق JSON المطلوب (التزم به حرفياً):
${JSON_FORMAT_EXAMPLE}

## تنبيه أخير:
ردك يجب أن يكون JSON صالح فقط. لا تكتب أي شيء آخر.`;

    const tried: string[] = [];
    let parsedResult: PetitionCheckResult | null = null;
    let usedModel = MODELS[0];

    // Strategy: Try each model, validate JSON response
    for (const m of MODELS) {
      tried.push(m.id);
      const { content, model } = await callModel(SYSTEM_PROMPT, userMsg, m);

      if (!content || content.length < 20) continue;

      console.log(`[PetitionCheck] Model ${m.id} returned ${content.length} chars`);

      // Try to parse and validate
      const parsed = parseAndValidate(content);
      if (parsed) {
        parsedResult = parsed;
        usedModel = model;
        break;
      }

      // If Tier 0 failed JSON parsing, retry once with a stronger instruction
      if (m.tier === 0) {
        console.log(`[PetitionCheck] Retrying ${m.id} with stricter prompt...`);
        const retryMsg = userMsg + "\n\n⚠️ تنبيه مهم: ردك السابق لم يكن JSON صالح. يجب أن يكون الرد كائن JSON واحد فقط. لا تضف شيئاً قبله أو بعده. JSON فقط.";
        const retry = await callModel(SYSTEM_PROMPT, retryMsg, m);
        if (retry.content) {
          const retryParsed = parseAndValidate(retry.content);
          if (retryParsed) {
            parsedResult = retryParsed;
            usedModel = model;
            break;
          }
        }
      }

      // If no valid result yet, continue to next model
      usedModel = model;
    }

    // If all models returned content but none parsed successfully, use raw content
    if (!parsedResult) {
      // Build a best-effort result from the situation
      return NextResponse.json({
        ...createEmptyResult(),
        result: "needs_review",
        summary: "تم تحليل الوثيقة لكن تعذّر تنسيق النتائج تلقائياً. يرجى المحاولة مرة أخرى.",
        report: "⚠️ لم يتم الحصول على نتائج منظمة. يرجى إعادة المحاولة.",
        aiPowered: true,
        model: usedModel.id,
        modelLabel: usedModel.label,
        tier: usedModel.tier,
        triedModels: tried,
        parseFailed: true,
      });
    }

    const report = makeReport(parsedResult);

    return NextResponse.json({
      ...parsedResult,
      report,
      rawReport: report,
      aiPowered: true,
      model: usedModel.id,
      modelLabel: usedModel.label,
      tier: usedModel.tier,
      triedModels: tried,
      parseFailed: false,
    });
  } catch (err) {
    console.error("Petition Check Error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "حدث خطأ في تحليل الوثيقة. يرجى المحاولة مرة أخرى." }, { status: 500 });
  }
}
