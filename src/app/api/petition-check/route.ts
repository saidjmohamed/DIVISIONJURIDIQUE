import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════
// أداة الفحص الشكلي للعرائض القانونية — OpenRouter Parallel Fallback v2
//
// أفضل 10 نماذج مجانية من OpenRouter تفهم العربية والقانون (محدّث 03/04/2026):
//   يتم تجربة النماذج بالتوازي داخل كل مستوى (Tier) لضمان سرعة الاستجابة
//
//   Tier 1 (أقوى):
//     1. qwen/qwen3.6-plus:free     ← 1M ctx, عربي ممتاز ⭐
//     2. openai/gpt-oss-120b:free    ← 131K ctx, تفكير منطقي
//     3. qwen/qwen3-coder:free       ← 262K ctx, عربي جيد
//   
//   Tier 2 (قوية):
//     4. google/gemma-3-27b-it:free  ← 131K ctx, دقيق
//     5. meta-llama/llama-3.3-70b-instruct:free ← 65K ctx
//     6. stepfun/step-3.5-flash:free ← 256K ctx, سريع
//   
//   Tier 3 (احتياطية):
//     7. nvidia/nemotron-3-nano-30b-a3b:free
//     8. minimax/minimax-m2.5:free
//     9. openai/gpt-oss-20b:free
//     10. arcee-ai/trinity-mini:free
// ═══════════════════════════════════════════════════════════════════════════

// Edge runtime: 30s timeout on hobby plan (vs 10s for Node.js serverless)
export const runtime = 'edge';

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface ModelConfig {
  id: string;
  label: string;
  tier: number;
  maxTokens: number;
}

// أسرع النماذج أولاً — نبدأ بالأسرع استجابة للتوافق مع حدود Vercel
const ALL_MODELS: ModelConfig[] = [
  // Tier 1 - أقوى النماذج (محدّثة 03/04/2026)
  { id: "qwen/qwen3.6-plus:free",                label: "Qwen 3.6 Plus ⭐",       tier: 1, maxTokens: 4096 },
  { id: "openai/gpt-oss-120b:free",               label: "GPT OSS 120B ⭐",        tier: 1, maxTokens: 4096 },
  { id: "qwen/qwen3-coder:free",                  label: "Qwen3 Coder ⭐",         tier: 1, maxTokens: 4096 },
  // Tier 2 - قوية
  { id: "google/gemma-3-27b-it:free",             label: "Gemma 3 27B",            tier: 2, maxTokens: 4096 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B",          tier: 2, maxTokens: 4096 },
  { id: "stepfun/step-3.5-flash:free",            label: "Step 3.5 Flash",         tier: 2, maxTokens: 4096 },
  // Tier 3 - احتياطية
  { id: "nvidia/nemotron-3-nano-30b-a3b:free",    label: "Nemotron Nano 30B",      tier: 3, maxTokens: 4096 },
  { id: "minimax/minimax-m2.5:free",              label: "MiniMax M2.5",           tier: 3, maxTokens: 4096 },
  { id: "openai/gpt-oss-20b:free",                label: "GPT OSS 20B",            tier: 3, maxTokens: 4096 },
  { id: "arcee-ai/trinity-mini:free",             label: "Trinity Mini",           tier: 3, maxTokens: 4096 },
];

// Group models by tier for parallel execution
const TIER_1 = ALL_MODELS.filter(m => m.tier === 1);
const TIER_2 = ALL_MODELS.filter(m => m.tier === 2);
const TIER_3 = ALL_MODELS.filter(m => m.tier === 3);
const ALL_TIERS = [TIER_1, TIER_2, TIER_3];

// ─────────── البروميبت القانوني (مختصر للسرعة) ───────────
const LEGAL_SYSTEM_PROMPT = `أنت فاحص شكلي للعرائض القانونية الجزائرية. فحصك شكلي فقط.

المراجع: القانون 25-14 (ق.إ.ج) + الأمر 08-09 (ق.إ.م.إ)

الشروط الشكلية: لغة عربية، تاريخ، عنوان المحرر، الجهة القضائية، هوية الأطراف، صفة الشخص المعنوي عند الاقتضاء، عرض الوقائع، الطلبات، المرفقات إن ذُكرت، التوقيع واسم المحامي، التمثيل بمحامٍ حيث وجوبي.

قواعد: لا تحلل الموضوع، لا تقدّر فرص النجاح، لا تنشئ وقائع، اذكر المادة القانونية.

أجب فقط بـ JSON (بدون markdown أو نص إضافي):
{"result":"accepted"|"rejected"|"needs_review","score":0-100,"documentType":"...","court":"...","date":"...","summary":"...","passedChecks":[{"label":"...","article":"..."}],"failedChecks":[{"label":"...","article":"...","critical":true|false,"details":"..."}],"pendingChecks":[{"label":"...","reason":"..."}],"suggestions":[{"label":"...","suggestion":"..."}]}`;

// ─────────── OpenRouter Call ───────────
async function callModel(
  systemPrompt: string,
  userMessage: string,
  modelConfig: ModelConfig,
  timeoutMs: number,
): Promise<{ model: ModelConfig; content: string | null; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
        model: modelConfig.id,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: modelConfig.maxTokens,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { model: modelConfig, content: null, error: errBody?.error?.message || `HTTP ${res.status}` };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return { model: modelConfig, content: content || null };
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      return { model: modelConfig, content: null, error: "timeout" };
    }
    return { model: modelConfig, content: null, error: String(err) };
  }
}

// ─────────── Parallel Tier Execution ───────────
async function tryTierParallel(
  systemPrompt: string,
  userMessage: string,
  models: ModelConfig[],
  timeoutMs: number,
): Promise<{ model: ModelConfig; content: string } | null> {
  const promises = models.map(m => callModel(systemPrompt, userMessage, m, timeoutMs));

  // Use Promise.any to get the first successful response
  try {
    const results = await Promise.allSettled(promises);
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.content) {
        return { model: r.value.model, content: r.value.content };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────── JSON Parser ───────────
function parseAIResponse(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content);
  } catch {
    // Try markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch { /* continue */ }
    }
    // Try first JSON object
    const braceMatch = content.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try { return JSON.parse(braceMatch[0]); } catch { /* continue */ }
    }
    return null;
  }
}

// ─────────── Generate Report from Structured Data ───────────
function generateReport(data: Record<string, unknown>): string {
  const result = data.result === 'accepted' ? '✅ مقبول شكلاً' :
                data.result === 'rejected' ? '❌ مرفوض شكلاً' : '⚠️ ناقص شكلاً ويحتاج استكمال';

  const passed = (data.passedChecks as Array<{label: string; article: string}>) || [];
  const failed = (data.failedChecks as Array<{label: string; article: string; critical: boolean; details: string}>) || [];
  const pending = (data.pendingChecks as Array<{label: string; reason: string}>) || [];
  const suggestions = (data.suggestions as Array<{label: string; suggestion: string}>) || [];

  let report = `══════════════════════════════════════\n        تقرير الفحص الشكلي\n══════════════════════════════════════\n`;
  report += `📄 نوع الوثيقة         : ${data.documentType || 'غير محدد'}\n`;
  report += `⚖️  الجهة القضائية      : ${data.court || 'غير ظاهرة'}\n`;
  report += `📅 تاريخ التحرير       : ${data.date || 'غير مذكور'}\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `🎯 النتيجة الشكلية النهائية: ${result}\n`;
  report += `📊 الدرجة: ${data.score || '?'}/100\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (passed.length > 0) {
    report += `✅ الشروط المستوفاة:\n`;
    passed.forEach(c => { report += `   • ${c.label} — ${c.article}\n`; });
  }

  if (failed.length > 0) {
    report += `\n❌ الشروط غير المستوفاة:\n`;
    failed.forEach(c => {
      report += `   • ${c.label} — ${c.article} — ${c.critical ? 'جوهري' : 'قابل للتدارك'}\n`;
      if (c.details) report += `     ${c.details}\n`;
    });
  }

  if (pending.length > 0) {
    report += `\n🔍 فحوص معلّقة:\n`;
    pending.forEach(c => { report += `   • ${c.label} — ${c.reason}\n`; });
  }

  if (suggestions.length > 0) {
    report += `\n✏️ اقتراحات التنقيح الشكلي:\n`;
    suggestions.forEach(s => { report += `   • ${s.label} → ${s.suggestion}\n`; });
  }

  report += `\n══════════════════════════════════════\n`;
  report += `⚠️ تنبيه قانوني وإخلاء مسؤولية:\n`;
  report += `هذه الأداة مخصصة للفحص الشكلي الأولي للعرائض والمذكرات،\n`;
  report += `ولا تغني بأي حال عن مراجعة المحامي أو المستشار القانوني المختص.\n`;
  report += `\n🔒 الخصوصية: لا تحتفظ الأداة بأي ملفات أو معلومات خاصة.\n`;
  report += `══════════════════════════════════════`;

  return report;
}

// ─────────── POST Handler ───────────
export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { error: "مفتاح OpenRouter غير مضبوط. يرجى إضافة OPENROUTER_API_KEY في إعدادات التطبيق." },
      { status: 500 }
    );
  }

  try {
    const { text, documentType, documentCategory } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "النص فارغ" }, { status: 400 });
    }
    if (!documentType) {
      return NextResponse.json({ error: "يجب اختيار نوع الوثيقة" }, { status: 400 });
    }

    const typeLabels: Record<string, string> = {
      "civil_opening": "عريضة افتتاح دعوى مدنية (المواد 13-17 ق.إ.م.إ)",
      "civil_response": "مذكرة جوابية مدنية (المواد 25-27 ق.إ.م.إ)",
      "civil_rejoinder": "مذكرة تعقيبية مدنية (المواد 25-27 ق.إ.م.إ)",
      "civil_formal_challenge": "دفع شكلي مدني (المواد 50-54 ق.إ.م.إ)",
      "civil_incidental": "طلب عارض مدني (المواد 25, 28-30 ق.إ.م.إ)",
      "civil_appeal": "استئناف مدني (المواد 10, 34, 325-340 ق.إ.م.إ)",
      "civil_cassation": "طعن بالنقض مدني (المواد 349-354 ق.إ.م.إ)",
      "admin_initial": "دعوى إدارية ابتدائية (المواد 800-804 ق.إ.م.إ)",
      "admin_appeal": "استئناف إداري أمام مجلس الدولة (المواد 904-911 ق.إ.م.إ)",
      "crim_complaint": "شكوى عادية أمام وكيل الجمهورية (المواد 17, 26 ق.إ.ج 25-14)",
      "crim_civil_claim": "شكوى مصحوبة بادعاء مدني (المواد 72-75 ق.إ.ج 25-14)",
      "crim_direct_claim": "ادعاء مدني أمام جهة الحكم الجزائية (المواد 2-4 ق.إ.ج 25-14)",
      "crim_misdemeanor_defense": "مذكرة دفاع أمام محكمة الجنح (المواد 340-383 ق.إ.ج 25-14)",
      "crim_felony_defense": "مذكرة دفاع أمام محكمة الجنايات (المواد 340-383 ق.إ.ج 25-14)",
      "crim_opposition": "طعن بالمعارضة (المواد 398-401 ق.إ.ج 25-14)",
      "crim_appeal": "استئناف جزائي (المواد 414-419 ق.إ.ج 25-14)",
      "crim_cassation": "طعن بالنقض جزائي (المواد 495-500, 521 ق.إ.ج 25-14)",
      "crim_bail": "طلب إفراج مؤقت (المواد 123-127 ق.إ.ج 25-14)",
      "crim_indictment_appeal": "تظلم أمام غرفة الاتهام (المواد 175-177 ق.إ.ج 25-14)",
      "crim_incidental_memo": "مذكرة عارضة / دفع شكلي جزائي (المواد 344-348 ق.إ.ج 25-14)",
    };

    const docLabel = typeLabels[documentType] || documentType;
    const catLabel = { civil: "مدني", admin: "إداري", criminal: "جزائي" }[documentCategory] || "";

    const userMessage = `فحص شكلي:\nالنوع: ${docLabel}\nالتصنيف: ${catLabel}\n\nنص الوثيقة:\n${text.slice(0, 8000)}`;

    let reply: string | null = null;
    let usedModel: ModelConfig | null = null;
    const triedModels: string[] = [];

    // Parallel Fallback: try all models in a tier simultaneously
    // Tier 1: 3 models in parallel (8s timeout each)
    // If all fail, try Tier 2: 3 models in parallel (6s timeout each)
    // If all fail, try Tier 3: 4 models in parallel (5s timeout each)
    const timeouts = [8000, 6000, 5000];

    for (let i = 0; i < ALL_TIERS.length && !reply; i++) {
      const tierModels = ALL_TIERS[i];
      tierModels.forEach(m => { if (!triedModels.includes(m.id)) triedModels.push(m.id); });

      const result = await tryTierParallel(LEGAL_SYSTEM_PROMPT, userMessage, tierModels, timeouts[i]);
      if (result) {
        reply = result.content;
        usedModel = result.model;
      }
    }

    if (!reply) {
      return NextResponse.json(
        {
          error: `جميع النماذج (${triedModels.length}) لم تُرجع رداً. يرجى المحاولة مرة أخرى.`,
          triedModels,
        },
        { status: 503 }
      );
    }

    // Parse the AI response
    const parsed = parseAIResponse(reply);
    if (parsed && parsed.result && parsed.score !== undefined) {
      // Generate the report from structured data (server-side)
      const report = generateReport(parsed);
      return NextResponse.json({
        ...parsed,
        report,
        rawReport: report,
        aiPowered: true,
        model: usedModel!.id,
        modelLabel: usedModel!.label,
        tier: usedModel!.tier,
        triedModels,
      });
    }

    // If parsing fails, return raw content
    return NextResponse.json({
      result: "needs_review",
      score: 50,
      summary: "تم تحليل الوثيقة لكن تعذّر تنسيق النتائج",
      report: reply,
      aiPowered: true,
      model: usedModel!.id,
      modelLabel: usedModel!.label,
      tier: usedModel!.tier,
      triedModels,
      passedChecks: [],
      failedChecks: [],
      pendingChecks: [],
      suggestions: [],
    });

  } catch (err) {
    console.error("Petition Check API Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
