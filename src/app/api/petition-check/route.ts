import { NextRequest, NextResponse } from "next/server";

// Edge runtime: 30s timeout on hobby plan
export const runtime = 'edge';

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ─────────── النماذج (محدّثة 03/04/2026) ───────────
const MODELS = [
  { id: "qwen/qwen3.6-plus:free",                label: "Qwen 3.6 Plus ⭐",       tier: 1 },
  { id: "openai/gpt-oss-120b:free",               label: "GPT OSS 120B ⭐",        tier: 1 },
  { id: "qwen/qwen3-coder:free",                  label: "Qwen3 Coder ⭐",         tier: 1 },
  { id: "stepfun/step-3.5-flash:free",            label: "Step 3.5 Flash",         tier: 2 },
  { id: "google/gemma-3-27b-it:free",             label: "Gemma 3 27B",            tier: 2 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B",          tier: 2 },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free",    label: "Nemotron Nano 30B",      tier: 3 },
  { id: "minimax/minimax-m2.5:free",              label: "MiniMax M2.5",           tier: 3 },
  { id: "openai/gpt-oss-20b:free",                label: "GPT OSS 20B",            tier: 3 },
  { id: "arcee-ai/trinity-mini:free",             label: "Trinity Mini",           tier: 3 },
];

// ─────────── البروميبت القانوني (مختصر جداً) ───────────
const SYSTEM_PROMPT = `أنت فاحص شكلي للعرائض الجزائرية. المرجع: القانون 25-14 + الأمر 08-09.
الشروط: عربية، تاريخ، عنوان المحرر، الجهة القضائية، هوية الأطراف، صفة الشخص المعنوي، عرض الوقائع، الطلبات، المرفقات، التوقيع، التمثيل بمحامٍ.
قواعد: فحص شكلي فقط، لا تحلل الموضوع، اذكر المادة القانونية.
أجب فقط بـ JSON بدون markdown:
{"result":"accepted"|"rejected"|"needs_review","score":0-100,"documentType":"...","court":"...","date":"...","summary":"ملخص قصير","passedChecks":[{"label":"شرط","article":"مادة"}],"failedChecks":[{"label":"شرط","article":"مادة","critical":bool,"details":"تفاصيل"}],"suggestions":[{"label":"عنصر","suggestion":"اقتراح"}]}`;

// ─────────── OpenRouter Call ───────────
async function callModel(
  systemPrompt: string,
  userMessage: string,
  modelId: string,
  timeoutMs: number,
): Promise<{ id: string; content: string | null; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hiyaat-dz.vercel.app",
        "X-Title": "Shamil DZ",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 2048,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { id: modelId, content: null, error: err?.error?.message || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { id: modelId, content: data?.choices?.[0]?.message?.content || null };
  } catch (e: unknown) {
    clearTimeout(timer);
    return { id: modelId, content: null, error: e instanceof DOMException && e.name === "AbortError" ? "timeout" : String(e) };
  }
}

// ─────────── JSON Parser ───────────
function parseJSON(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1].trim()); } catch {} }
  const b = text.match(/\{[\s\S]*\}/);
  if (b) { try { return JSON.parse(b[0]); } catch {} }
  return null;
}

// ─────────── Report Generator ───────────
function makeReport(d: Record<string, unknown>): string {
  const r = d.result === 'accepted' ? '✅ مقبول شكلاً' : d.result === 'rejected' ? '❌ مرفوض شكلاً' : '⚠️ ناقص شكلاً';
  let s = `══════════════════════════════════════\n        تقرير الفحص الشكلي\n══════════════════════════════════════\n`;
  s += `📄 نوع الوثيقة: ${d.documentType || 'غير محدد'}\n⚖️ الجهة القضائية: ${d.court || 'غير ظاهرة'}\n📅 التاريخ: ${d.date || 'غير مذكور'}\n`;
  s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎯 النتيجة: ${r} (${d.score || 0}/100)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  for (const c of (d.passedChecks as Array<{label:string;article:string}>) || [])
    s += `✅ ${c.label} — ${c.article}\n`;
  for (const c of (d.failedChecks as Array<{label:string;article:string;critical:boolean;details:string}>) || [])
    s += `❌ ${c.label} — ${c.article} — ${c.critical ? 'جوهري' : 'قابل للتدارك'}\n   ${c.details || ''}\n`;
  for (const c of (d.suggestions as Array<{label:string;suggestion:string}>) || [])
    s += `✏️ ${c.label} → ${c.suggestion}\n`;
  s += `\n⚠️ تنبيه: هذه الأداة للفحص الشكلي الأولي ولا تغني عن مراجعة المحامي.\n🔒 لا تُحفظ أي بيانات بعد الفحص.\n══════════════════════════════════════`;
  return s;
}

// ─────────── Type Labels ───────────
const TYPE_LABELS: Record<string, string> = {
  civil_opening: "عريضة افتتاح دعوى مدنية (المواد 13-17 ق.إ.م.إ)",
  civil_response: "مذكرة جوابية (المواد 25-27 ق.إ.م.إ)",
  civil_rejoinder: "مذكرة تعقيبية (المواد 25-27 ق.إ.م.إ)",
  civil_formal_challenge: "دفع شكلي (المواد 50-54 ق.إ.م.إ)",
  civil_incidental: "طلب عارض (المواد 25, 28-30 ق.إ.م.إ)",
  civil_appeal: "استئناف مدني (المواد 325-340 ق.إ.م.إ)",
  civil_cassation: "طعن بالنقض مدني (المواد 349-354 ق.إ.م.إ)",
  admin_initial: "دعوى إدارية (المواد 800-804 ق.إ.م.إ)",
  admin_appeal: "استئناف إداري (المواد 904-911 ق.إ.م.إ)",
  crim_complaint: "شكوى عادية (المواد 17, 26 ق.إ.ج 25-14)",
  crim_civil_claim: "شكوى مع ادعاء مدني (المواد 72-75 ق.إ.ج 25-14)",
  crim_direct_claim: "ادعاء مدني (المواد 2-4 ق.إ.ج 25-14)",
  crim_misdemeanor_defense: "مذكرة دفاع جنح (المواد 340-383 ق.إ.ج 25-14)",
  crim_felony_defense: "مذكرة دفاع جنايات (المواد 340-383 ق.إ.ج 25-14)",
  crim_opposition: "معارضة (المواد 398-401 ق.إ.ج 25-14)",
  crim_appeal: "استئناف جزائي (المواد 414-419 ق.إ.ج 25-14)",
  crim_cassation: "نقض جزائي (المواد 495-500 ق.إ.ج 25-14)",
  crim_bail: "إفراج مؤقت (المواد 123-127 ق.إ.ج 25-14)",
  crim_indictment_appeal: "تظلم غرفة الاتهام (المواد 175-177 ق.إ.ج 25-14)",
  crim_incidental_memo: "مذكرة عارضة/دفع شكلي (المواد 344-348 ق.إ.ج 25-14)",
};

// ─────────── POST ───────────
export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: "مفتاح API غير مضبوط" }, { status: 500 });
  }

  try {
    const { text, documentType, documentCategory } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "النص فارغ" }, { status: 400 });
    if (!documentType) return NextResponse.json({ error: "اختر نوع الوثيقة" }, { status: 400 });

    const docLabel = TYPE_LABELS[documentType] || documentType;
    const catLabel = { civil: "مدني", admin: "إداري", criminal: "جزائي" }[documentCategory] || "";
    const userMsg = `فحص شكلي: ${docLabel} (${catLabel})\n\n${text.slice(0, 6000)}`;

    // Sequential fallback with short timeouts (must fit in ~25s edge limit)
    let reply: string | null = null;
    let usedModel = MODELS[0];
    const tried: string[] = [];

    // Try Tier 1 first (15s per model)
    for (const m of MODELS.filter(m => m.tier === 1)) {
      tried.push(m.id);
      const r = await callModel(SYSTEM_PROMPT, userMsg, m.id, 15000);
      if (r.content) { reply = r.content; usedModel = m; break; }
    }

    // If Tier 1 fails, try Tier 2 (10s per model, only 1-2)
    if (!reply) {
      for (const m of MODELS.filter(m => m.tier === 2).slice(0, 2)) {
        tried.push(m.id);
        const r = await callModel(SYSTEM_PROMPT, userMsg, m.id, 10000);
        if (r.content) { reply = r.content; usedModel = m; break; }
      }
    }

    if (!reply) {
      return NextResponse.json(
        { error: `جميع النماذج (${tried.length}) لم تُرجع رداً. حاول مرة أخرى.`, triedModels: tried },
        { status: 503 }
      );
    }

    // Parse response
    const parsed = parseJSON(reply);
    if (parsed && parsed.result && parsed.score !== undefined) {
      const report = makeReport(parsed);
      return NextResponse.json({
        ...parsed,
        report,
        rawReport: report,
        aiPowered: true,
        model: usedModel.id,
        modelLabel: usedModel.label,
        tier: usedModel.tier,
        triedModels: tried,
      });
    }

    // Fallback: return raw
    return NextResponse.json({
      result: "needs_review", score: 50,
      summary: "تم التحليل لكن تعذّر تنسيق النتائج",
      report: reply, aiPowered: true,
      model: usedModel.id, modelLabel: usedModel.label,
      tier: usedModel.tier, triedModels: tried,
      passedChecks: [], failedChecks: [], pendingChecks: [], suggestions: [],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
