import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// النماذج مرتبة: Qwen3.6 Plus أولاً (الأقوى للعربية والقانون) ثم fallback حسب السرعة والأداء
interface PetitionModel { id: string; label: string; tier: number; maxTokens: number; }
const MODELS: PetitionModel[] = [
  // ⭐ النموذج الرئيسي — أقوى نموذج للعربية والقانون الجزائري
  { id: "qwen/qwen3.6-plus:free",                 label: "Qwen 3.6 Plus ⭐",       tier: 0,  maxTokens: 4096 },  // 1M سياق — عربي ممتاز
  // ⚡ Fallback — أسرع النماذج
  { id: "nvidia/nemotron-3-nano-30b-a3b:free",    label: "Nemotron Nano 30B ⚡",  tier: 1,  maxTokens: 2048 },  // ~1.5s
  { id: "openai/gpt-oss-20b:free",                label: "GPT OSS 20B ⚡",       tier: 1,  maxTokens: 2048 },  // ~4s
  { id: "arcee-ai/trinity-mini:free",             label: "Trinity Mini ⚡",       tier: 1,  maxTokens: 2048 },  // ~5s
  { id: "stepfun/step-3.5-flash:free",            label: "Step 3.5 Flash ⚡",     tier: 1,  maxTokens: 2048 },  // ~5.5s
  // 💪 أقوى النماذج البديلة (fallback أدق)
  { id: "openai/gpt-oss-120b:free",               label: "GPT OSS 120B",          tier: 2,  maxTokens: 3072 },
  { id: "qwen/qwen3-coder:free",                  label: "Qwen3 Coder",           tier: 2,  maxTokens: 3072 },
  // 🔵 احتياطية أخيرة
  { id: "google/gemma-3-27b-it:free",             label: "Gemma 3 27B",           tier: 3,  maxTokens: 2048 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B",         tier: 3,  maxTokens: 2048 },
  { id: "minimax/minimax-m2.5:free",              label: "MiniMax M2.5",          tier: 3,  maxTokens: 2048 },
];

const SYSTEM_PROMPT = `أنت فاحص شكلي متخصص للعرائض والمحررات القانونية الجزائرية، تعمل وفق:
- القانون رقم 25-14 المؤرخ في 3 غشت 2025 المتضمن قانون الإجراءات الجزائية (ق.إ.ج الجديد)
- الأمر رقم 08-09 المؤرخ في 25 فبراير 2008 المتضمن قانون الإجراءات المدنية والإدارية (ق.إ.م.إ) وتعديلاته

📝 قواعد الفحص الصارمة (لا تحيد عنها أبداً):
1. فحصك شكلي فقط — لا تحلل الموضوع ولا تقدّر فرص النجاح ولا ترجّح صدق الوقائع
2. لا تصف الدفوع بأنها قوية أو ضعيفة
3. لا تنشئ وقائع غير موجودة في الملف ولا تفترض مرفقات غير مذكورة
4. إذا كان عنصر شكلي غير ظاهر في النص ← قل: "غير ظاهر من الملف"
5. إذا تعذّر التحقق من أجل أو تبليغ أو رسم ← صنّفه "فحص معلّق على التحقق من المرفقات"
6. اذكر رقم المادة القانونية مع كل ملاحظة
7. استخدم لغة قانونية مهنية واضحة وموجزة

📋 الشروط الشكلية المشتركة لفحص جميع الوثائق:
- اللغة العربية (مخالفة شكلية جوهرية عند الغياب)
- تاريخ التحرير (نقص شكلي)
- عنوان/تسمية المحرر (نقص شكلي)
- تحديد الجهة القضائية (رفض شكلي)
- هوية الأطراف الكاملة: اسم، لقب، موطن (رفض شكلي)
- صفة الشخص المعنوي ومقره وممثله عند الاقتضاء (رفض شكلي)
- عرض موجز للوقائع (نقص شكلي)
- الطلبات أو أوجه الطعن (رفض شكلي)
- الإشارة للمرفقات إن ذُكرت (نقص قابل للتدارك)
- التوقيع وبيان اسم المحامي (نقص شكلي)
- التمثيل بمحامٍ حيث يكون وجوبياً (رفض شكلي)

🎯 ثلاثة مستويات للنتيجة:
- ✅ مقبول شكلاً: تتوفر جميع البيانات الشكلية الجوهرية
- ⚠️ ناقص شكلاً: نقص قابل للتدارك أو غامض
- ❌ مرفوض شكلاً: نقص جوهري صريح تحت طائلة عدم القبول

أجب فقط بـ JSON بدون أي نص أو markdown إضافي:
{"result":"accepted"|"rejected"|"needs_review","score":0-100,"documentType":"نوع المحرر المحدد","court":"الجهة القضائية المستخرجة أو غير ظاهرة","date":"التاريخ المستخرج أو غير مذكور","summary":"ملخص مختصر للحالة الشكلية","passedChecks":[{"label":"اسم الشرط المستوفى","article":"المادة القانونية"}],"failedChecks":[{"label":"اسم الشرط الناقص","article":"المادة القانونية","critical":true أو false,"details":"شرح التفاصيل والأثر"}],"pendingChecks":[{"label":"العنصر المعلّق","reason":"سبب التعليق"}],"suggestions":[{"label":"العنصر المقترح","suggestion":"الاقتراح دون المساس بالمضمون"}]}`;

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

function parseJSON(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1].trim()); } catch {} }
  const b = text.match(/\{[\s\S]*\}/);
  if (b) { try { return JSON.parse(b[0]); } catch {} }
  return null;
}

function makeReport(d: Record<string, unknown>): string {
  const r = d.result === 'accepted' ? '✅ مقبول شكلاً' : d.result === 'rejected' ? '❌ مرفوض شكلاً' : '⚠️ ناقص شكلاً ويحتاج استكمال';
  let s = `══════════════════════════════════════\n        تقرير الفحص الشكلي\n══════════════════════════════════════\n`;
  s += `📄 نوع الوثيقة: ${d.documentType || 'غير محدد'}\n`;
  s += `⚖️ الجهة القضائية: ${d.court || 'غير ظاهرة'}\n`;
  s += `📅 التاريخ: ${d.date || 'غير مذكور'}\n`;
  s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  s += `🎯 النتيجة الشكلية النهائية: ${r}\n`;
  s += `📊 الدرجة: ${d.score || 0}/100\n`;
  s += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  const passed = (d.passedChecks as Array<{label:string;article:string}>) || [];
  const failed = (d.failedChecks as Array<{label:string;article:string;critical:boolean;details:string}>) || [];
  const pending = (d.pendingChecks as Array<{label:string;reason:string}>) || [];
  const suggestions = (d.suggestions as Array<{label:string;suggestion:string}>) || [];

  if (passed.length > 0) {
    s += `✅ الشروط المستوفاة:\n`;
    for (const c of passed) s += `   • ${c.label} — ${c.article}\n`;
  }
  if (failed.length > 0) {
    s += `\n❌ الشروط غير المستوفاة:\n`;
    for (const c of failed) s += `   • ${c.label} — ${c.article} — ${c.critical ? 'جوهري' : 'قابل للتدارك'}\n     ${c.details || ''}\n`;
  }
  if (pending.length > 0) {
    s += `\n🔍 فحوص معلّقة:\n`;
    for (const c of pending) s += `   • ${c.label} — ${c.reason}\n`;
  }
  if (suggestions.length > 0) {
    s += `\n✏️ اقتراحات التنقيح الشكلي:\n`;
    for (const c of suggestions) s += `   • ${c.label} → ${c.suggestion}\n`;
  }
  s += `\n══════════════════════════════════════\n`;
  s += `⚠️ تنبيه قانوني: هذه الأداة للفحص الشكلي الأولي ولا تغني عن مراجعة المحامي المختص.\n`;
  s += `🔒 الخصوصية: لا تُحفظ أي بيانات بعد انتهاء الفحص.\n`;
  s += `══════════════════════════════════════`;
  return s;
}

export const maxDuration = 60; // Vercel function timeout — يدعم Qwen3.6 Plus بـ 20s

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: "مفتاح OpenRouter غير مضبوط" }, { status: 500 });
  }

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

    // Sequential fallback — Qwen3.6 Plus أولاً (Tier 0) ثم الأسرع (Tier 1-3)
    for (const m of MODELS) {
      tried.push(m.id);
      const timeout = m.tier === 0 ? 20000 : m.tier === 1 ? 8000 : m.tier === 2 ? 10000 : 6000;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const maxTok = m.maxTokens;
        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://hiyaat-dz.vercel.app",
            "X-Title": "Shamil DZ - Legal Checker",
          },
          body: JSON.stringify({
            model: m.id,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userMsg },
            ],
            max_tokens: maxTok,
            temperature: 0.3,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) continue;
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content && content.trim().length > 10) {
          reply = content;
          usedModel = m;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!reply) {
      return NextResponse.json(
        { error: `جميع النماذج (${tried.length}) لم تُرجع رداً. يرجى المحاولة مرة أخرى.`, triedModels: tried },
        { status: 503 }
      );
    }

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

    return NextResponse.json({
      result: "needs_review", score: 50,
      summary: "تم تحليل الوثيقة لكن تعذّر تنسيق النتائج تلقائياً",
      report: reply, aiPowered: true,
      model: usedModel.id, modelLabel: usedModel.label,
      tier: usedModel.tier, triedModels: tried,
      passedChecks: [], failedChecks: [], pendingChecks: [], suggestions: [],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
