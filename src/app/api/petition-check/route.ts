import { NextRequest, NextResponse } from "next/server";

// Edge runtime for 30s timeout
export const runtime = 'edge';

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODELS = [
  { id: "qwen/qwen3.6-plus:free",                label: "Qwen 3.6 Plus ⭐" },
  { id: "openai/gpt-oss-120b:free",               label: "GPT OSS 120B ⭐" },
  { id: "qwen/qwen3-coder:free",                  label: "Qwen3 Coder ⭐" },
  { id: "stepfun/step-3.5-flash:free",            label: "Step 3.5 Flash" },
  { id: "google/gemma-3-27b-it:free",             label: "Gemma 3 27B" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free",    label: "Nemotron Nano 30B" },
  { id: "minimax/minimax-m2.5:free",              label: "MiniMax M2.5" },
  { id: "openai/gpt-oss-20b:free",                label: "GPT OSS 20B" },
  { id: "arcee-ai/trinity-mini:free",             label: "Trinity Mini" },
];

const SYSTEM_PROMPT = `فاحص شكلي للعرائض الجزائرية. المرجع: ق.إ.ج 25-14 + ق.إ.م.إ 08-09.
فحص شكلي فقط: عربية، تاريخ، عنوان، جهة قضائية، هوية أطراف، صفة معنوي، وقائع، طلبات، مرفقات، توقيع، محامي.
لا تحلل الموضوع. اذكر المادة.
رد بـ JSON فقط:{"result":"accepted"|"rejected"|"needs_review","score":0-100,"documentType":"...","court":"...","date":"...","summary":"...","passedChecks":[{"label":"...","article":"..."}],"failedChecks":[{"label":"...","article":"...","critical":true,"details":"..."}],"suggestions":[{"label":"...","suggestion":"..."}]}`;

const TYPE_LABELS: Record<string, string> = {
  civil_opening: "عريضة افتتاح (المواد 13-17 ق.إ.م.إ)",
  civil_response: "مذكرة جوابية (المواد 25-27 ق.إ.م.إ)",
  civil_rejoinder: "مذكرة تعقيبية (المواد 25-27 ق.إ.م.إ)",
  civil_formal_challenge: "دفع شكلي (المواد 50-54 ق.إ.م.إ)",
  civil_incidental: "طلب عارض (المواد 28-30 ق.إ.م.إ)",
  civil_appeal: "استئناف مدني (المواد 325-340 ق.إ.م.إ)",
  civil_cassation: "نقض مدني (المواد 349-354 ق.إ.م.إ)",
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

function parseJSON(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1].trim()); } catch {} }
  const b = text.match(/\{[\s\S]*\}/);
  if (b) { try { return JSON.parse(b[0]); } catch {} }
  return null;
}

function makeReport(d: Record<string, unknown>): string {
  const r = d.result === 'accepted' ? '✅ مقبول شكلاً' : d.result === 'rejected' ? '❌ مرفوض شكلاً' : '⚠️ ناقص شكلاً';
  let s = `══════════════════════════════════════\n        تقرير الفحص الشكلي\n══════════════════════════════════════\n`;
  s += `📄 نوع الوثيقة: ${d.documentType || 'غير محدد'}\n⚖️ الجهة القضائية: ${d.court || 'غير ظاهرة'}\n📅 التاريخ: ${d.date || 'غير مذكور'}\n`;
  s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎯 النتيجة: ${r} (${d.score || 0}/100)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  for (const c of (d.passedChecks as Array<{label:string;article:string}>) || []) s += `✅ ${c.label} — ${c.article}\n`;
  for (const c of (d.failedChecks as Array<{label:string;article:string;critical:boolean;details:string}>) || []) s += `❌ ${c.label} — ${c.article} — ${c.critical ? 'جوهري' : 'قابل للتدارك'}\n   ${c.details || ''}\n`;
  for (const c of (d.suggestions as Array<{label:string;suggestion:string}>) || []) s += `✏️ ${c.label} → ${c.suggestion}\n`;
  s += `\n⚠️ تنبيه: هذه الأداة للفحص الشكلي الأولي ولا تغني عن مراجعة المحامي.\n🔒 لا تُحفظ أي بيانات بعد الفحص.\n══════════════════════════════════════`;
  return s;
}

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) return NextResponse.json({ error: "مفتاح API غير مضبوط" }, { status: 500 });

  try {
    const { text, documentType, documentCategory } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "النص فارغ" }, { status: 400 });
    if (!documentType) return NextResponse.json({ error: "اختر نوع الوثيقة" }, { status: 400 });

    const docLabel = TYPE_LABELS[documentType] || documentType;
    const cat = { civil: "مدني", admin: "إداري", criminal: "جزائي" }[documentCategory] || "";
    const userMsg = `فحص شكلي: ${docLabel} (${cat})\n\n${text.slice(0, 5000)}`;

    let reply: string | null = null;
    let usedModel = MODELS[0];
    const tried: string[] = [];

    // Try models one by one with short timeouts to fit in edge 25s limit
    for (let i = 0; i < MODELS.length && !reply; i++) {
      const m = MODELS[i];
      tried.push(m.id);
      // Dynamic timeout: more time for first models, less for later ones
      const timeout = i < 2 ? 12000 : i < 5 ? 8000 : 5000;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://hiyaat-dz.vercel.app",
            "X-Title": "Shamil DZ",
          },
          body: JSON.stringify({
            model: m.id,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userMsg },
            ],
            max_tokens: 1500,
            temperature: 0.3,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) continue;
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) { reply = content; usedModel = m; }
      } catch {
        continue;
      }
    }

    if (!reply) {
      return NextResponse.json(
        { error: `جميع النماذج (${tried.length}) لم تُرجع رداً. حاول مرة أخرى.`, triedModels: tried },
        { status: 503 }
      );
    }

    const parsed = parseJSON(reply);
    if (parsed && parsed.result && parsed.score !== undefined) {
      const report = makeReport(parsed);
      return NextResponse.json({
        ...parsed, report, rawReport: report,
        aiPowered: true, model: usedModel.id, modelLabel: usedModel.label,
        tier: 1, triedModels: tried,
      });
    }

    return NextResponse.json({
      result: "needs_review", score: 50, summary: "تم التحليل لكن تعذّر تنسيق النتائج",
      report: reply, aiPowered: true, model: usedModel.id, modelLabel: usedModel.label,
      tier: 1, triedModels: tried, passedChecks: [], failedChecks: [], pendingChecks: [], suggestions: [],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
