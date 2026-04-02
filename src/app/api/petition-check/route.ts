import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════
// أداة الفحص الشكلي للعرائض القانونية — OpenRouter Multi-Model Fallback
//
// أفضل 10 نماذج مجانية من OpenRouter تفهم العربية والقانون:
//   Tier 1 (أقوى — ذكاء عالي + عربي ممتاز + سياق طويل):
//     1. qwen/qwen-2.5-72b-instruct:free       ← 128K context, عربي ممتاز
//     2. qwen/qwen3-235b-a22b:free              ← 235B, 1M context, reasoning
//     3. nvidia/llama-3.1-nemotron-70b-instruct:free ← 70B, متعدد اللغات
//   
//   Tier 2 (قوية — احتياطية):
//     4. meta-llama/llama-4-maverick:free        ← 400B MoE, 1M context
//     5. google/gemma-3-27b-it:free              ← Google, دقيق
//     6. mistralai/mistral-small-3.1-24b-instruct:free ← Mistral, فرنسي/عربي
//   
//   Tier 3 (احتياطية أخيرة):
//     7. meta-llama/llama-3.3-70b-instruct:free  ← Meta, متعدد اللغات
//     8. qwen/qwen-2.5-32b-instruct:free        ← Qwen, سريع جداً
//     9. microsoft/phi-4-reasoning-plus:free     ← Microsoft, تفكير منطقي
//     10. deepseek/deepseek-r1-0528:free         ← DeepSeek R1, تفكير عميق
// ═══════════════════════════════════════════════════════════════════════════

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface ModelConfig {
  id: string;
  label: string;
  tier: number;
  maxTokens: number;
  description: string;
}

const ALL_MODELS: ModelConfig[] = [
  // Tier 1 - أقوى النماذج للعربية والقانون
  {
    id: "qwen/qwen-2.5-72b-instruct:free",
    label: "Qwen 2.5 72B",
    tier: 1,
    maxTokens: 8192,
    description: "128K سياق — عربي ممتاز + قانون",
  },
  {
    id: "qwen/qwen3-235b-a22b:free",
    label: "Qwen3 235B",
    tier: 1,
    maxTokens: 8192,
    description: "235B — 1M سياق + تفكير عميق",
  },
  {
    id: "nvidia/llama-3.1-nemotron-70b-instruct:free",
    label: "Nemotron 70B",
    tier: 1,
    maxTokens: 8192,
    description: "NVIDIA — ذكاء عالي + متعدد اللغات",
  },
  // Tier 2 - قوية
  {
    id: "meta-llama/llama-4-maverick:free",
    label: "Llama 4 Maverick",
    tier: 2,
    maxTokens: 8192,
    description: "400B MoE — 1M سياق",
  },
  {
    id: "google/gemma-3-27b-it:free",
    label: "Gemma 3 27B",
    tier: 2,
    maxTokens: 8192,
    description: "Google — دقيق ومنضبط",
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    label: "Mistral Small 3.1",
    tier: 2,
    maxTokens: 8192,
    description: "Mistral — فرنسي + عربي جيد",
  },
  // Tier 3 - احتياطية أخيرة
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B",
    tier: 3,
    maxTokens: 8192,
    description: "Meta — متعدد اللغات",
  },
  {
    id: "qwen/qwen-2.5-32b-instruct:free",
    label: "Qwen 2.5 32B",
    tier: 3,
    maxTokens: 8192,
    description: "سريع جداً — عربي جيد",
  },
  {
    id: "microsoft/phi-4-reasoning-plus:free",
    label: "Phi-4 Reasoning",
    tier: 3,
    maxTokens: 8192,
    description: "Microsoft — تفكير منطقي",
  },
  {
    id: "deepseek/deepseek-r1-0528:free",
    label: "DeepSeek R1",
    tier: 3,
    maxTokens: 8192,
    description: "تفكير عميق — دقيق جداً",
  },
];

const FALLBACK_CHAIN = ALL_MODELS.sort((a, b) => a.tier - b.tier);

// ─────────── البروميبت القانوني الشامل ───────────
const LEGAL_SYSTEM_PROMPT = `أنت وكيل برمجي متخصص مهمتك **فحص العرائض والمحررات القانونية فحصاً شكلياً فقط** وفق القانون الجزائري.

المرجع القانوني الأساسي للجانب الجزائي هو:
**القانون رقم 25-14 المؤرخ في 3 غشت سنة 2025** (مطابق للجريدة الرسمية عدد 54 المنشورة في 03/08/2025) المتضمن قانون الإجراءات الجزائية الجزائري — النص الساري المفعول.

والمرجع القانوني للجانب المدني والإداري هو:
**الأمر رقم 08-09 المؤرخ في 25 فبراير 2008** المتضمن قانون الإجراءات المدنية والإدارية وتعديلاته.

## الهدف الوظيفي:
تفحص الوثيقة **شكلاً فقط** وتُخرج نتيجة:
- ✅ **مقبول شكلاً**
- ⚠️ **ناقص شكلاً ويحتاج استكمال**
- ❌ **مرفوض شكلاً**

مع ذكر المادة القانونية والعلة لكل ملاحظة، دون أي تحليل موضوعي.

## الشروط الشكلية المشتركة لجميع الوثائق:
1. اللغة العربية — مخالفة شكلية جوهرية
2. تاريخ التحرير — نقص شكلي
3. عنوان/تسمية المحرر — نقص شكلي
4. تحديد الجهة القضائية — رفض شكلي
5. هوية الأطراف (اسم، لقب، موطن) — رفض شكلي
6. صفة الشخص المعنوي ومقره وممثله — رفض شكلي عند الاقتضاء
7. عرض موجز للوقائع — نقص شكلي
8. الطلبات أو أوجه الطعن — رفض شكلي
9. الإشارة للمرفقات إن ذُكرت — نقص قابل للتدارك
10. التوقيع وبيان اسم المحامي — نقص شكلي
11. التمثيل بمحامٍ حيث يكون وجوبياً — رفض شكلي

## القواعد الصارمة (لا تخرج عنها أبداً):
1. **لا تحلل الموضوع** — الفحص شكلي فقط.
2. **لا تقدّر فرص النجاح** — ممنوع منعاً باتاً.
3. **لا ترجّح صدق الوقائع** — فحص شكلي فقط.
4. **لا تصف الدفوع بأنها قوية أو ضعيفة.**
5. **لا تنشئ وقائع غير موجودة في الملف.**
6. **لا تفترض مرفقات غير مذكورة.**
7. إذا كان عنصر شكلي **غير ظاهر في النص** → قل: "غير ظاهر من الملف".
8. إذا تعذّر التحقق من أجل أو تبليغ أو رسم → صنّفه "فحص معلّق على التحقق من المرفقات".
9. **استخدم لغة قانونية مهنية واضحة وموجزة.**
10. **اذكر رقم المادة القانونية** مع كل ملاحظة.

## هيكل تقرير النتيجة المطلوب:
أجب **حصرياً** بصيغة JSON التالية (بدون أي نص إضافي قبلها أو بعدها):
{
  "result": "accepted" | "rejected" | "needs_review",
  "score": <0-100>,
  "documentType": "<نوع المحرر>",
  "court": "<الجهة القضائية أو غير ظاهرة>",
  "date": "<التاريخ أو غير مذكور>",
  "summary": "<ملخص مختصر بالعربية>",
  "passedChecks": [
    { "label": "<الشرط>", "article": "<المادة>" }
  ],
  "failedChecks": [
    { "label": "<الشرط الناقص>", "article": "<المادة>", "critical": true/false, "details": "<التفاصيل>" }
  ],
  "pendingChecks": [
    { "label": "<العنصر>", "reason": "<سبب التعليق>" }
  ],
  "suggestions": [
    { "label": "<العنصر>", "suggestion": "<الصياغة المقترحة>" }
  ],
  "report": "<التقرير الكامل بصيغة النص المنسق>"
}

التقرير الكامل (حقل report) يجب أن يكون بالصيغة التالية:
══════════════════════════════════════
        تقرير الفحص الشكلي
══════════════════════════════════════
📄 نوع الوثيقة         : [نوع المحرر]
⚖️  الجهة القضائية      : [المستخرجة أو "غير ظاهرة"]
📅 تاريخ التحرير       : [المستخرج أو "غير مذكور"]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 النتيجة الشكلية النهائية: [ ✅ مقبول | ⚠️ ناقص | ❌ مرفوض ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ الشروط المستوفاة:
   • [الشرط] — [المادة]
❌ الشروط غير المستوفاة:
   • [الشرط] — [المادة] — [جوهري / قابل للتدارك]
⚠️ نقائص قابلة للتدارك:
   • ...
🔍 فحوص معلّقة:
   • [العنصر] — [سبب التعليق]
✏️ اقتراحات التنقيح الشكلي:
   • [العنصر] → [الصياغة المقترحة]
══════════════════════════════════════
⚠️ تنبيه: هذه الأداة للفحص الشكلي الأولي فقط ولا تغني عن مراجعة المحامي المختص.
🔒 الخصوصية: لا يتم حفظ أي ملفات أو بيانات بعد انتهاء الفحص.
══════════════════════════════════════

مهم جداً: أجب بـ JSON فقط بدون أي markdown أو نص إضافي.`;

// ─────────── OpenRouter Call ───────────
async function callOpenRouter(
  messages: { role: string; content: string }[],
  modelConfig: ModelConfig,
): Promise<{ content: string | null; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const body: Record<string, unknown> = {
      model: modelConfig.id,
      messages: [
        { role: "system", content: LEGAL_SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: modelConfig.maxTokens,
      temperature: 0.3,
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hiyaat-dz.vercel.app",
        "X-Title": "Shamil DZ - Legal Document Checker",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errMsg = errBody?.error?.message || `HTTP ${res.status}`;
      return { content: null, error: errMsg };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return { content: content || null };
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      return { content: null, error: "timeout" };
    }
    return { content: null, error: String(err) };
  }
}

function parseAIResponse(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch { /* continue */ }
    }
    const braceMatch = content.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try { return JSON.parse(braceMatch[0]); } catch { /* continue */ }
    }
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { error: "مفتاح OpenRouter غير مضبوط." },
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
      "admin_initial": "دعوى إدارية ابتدائية أمام المحكمة الإدارية (المواد 800-804 ق.إ.م.إ)",
      "admin_appeal": "استئناف إداري أمام مجلس الدولة (المواد 904-911 ق.إ.م.إ)",
      "crim_complaint": "شكوى عادية أمام وكيل الجمهورية (المواد 17, 26 ق.إ.ج 25-14)",
      "crim_civil_claim": "شكوى مصحوبة بادعاء مدني أمام قاضي التحقيق (المواد 72-75 ق.إ.ج 25-14)",
      "crim_direct_claim": "ادعاء مدني أمام جهة الحكم الجزائية (المواد 2-4 ق.إ.ج 25-14)",
      "crim_misdemeanor_defense": "مذكرة دفاع أمام محكمة الجنح (المواد 340-383 ق.إ.ج 25-14)",
      "crim_felony_defense": "مذكرة دفاع أمام محكمة الجنايات (المواد 340-383 ق.إ.ج 25-14)",
      "crim_opposition": "طعن بالمعارضة في مواد الجنح (المواد 398-401 ق.إ.ج 25-14)",
      "crim_appeal": "استئناف جزائي (المواد 414-419 ق.إ.ج 25-14)",
      "crim_cassation": "طعن بالنقض جزائي (المواد 495-500, 521 ق.إ.ج 25-14)",
      "crim_bail": "طلب إفراج مؤقت (المواد 123-127 ق.إ.ج 25-14)",
      "crim_indictment_appeal": "تظلم أمام غرفة الاتهام (المواد 175-177 ق.إ.ج 25-14)",
      "crim_incidental_memo": "مذكرة عارضة / دفع شكلي جزائي (المواد 344-348 ق.إ.ج 25-14)",
    };

    const docLabel = typeLabels[documentType] || documentType;
    const categoryLabels: Record<string, string> = {
      civil: "المحررات المدنية",
      admin: "المحررات الإدارية",
      criminal: "المحررات الجزائية",
    };
    const catLabel = categoryLabels[documentCategory] || "";

    const userMessage = `قم بفحص الوثيقة التالية شكلياً فقط:

**نوع الوثيقة:** ${docLabel}
**التصنيف:** ${catLabel}

**نص الوثيقة:**
${text}

أجب بصيغة JSON فقط كما هو مطلوب في التعليمات.`;

    let reply: string | null = null;
    let usedModelConfig: ModelConfig | null = null;
    const triedModels: string[] = [];
    const errors: string[] = [];

    for (const modelConfig of FALLBACK_CHAIN) {
      triedModels.push(modelConfig.id);
      const result = await callOpenRouter(
        [{ role: "user", content: userMessage }],
        modelConfig,
      );

      if (result.content) {
        reply = result.content;
        usedModelConfig = modelConfig;
        break;
      } else if (result.error) {
        errors.push(`${modelConfig.label}: ${result.error}`);
      }
    }

    if (!reply) {
      return NextResponse.json(
        { error: `جميع النماذج (${triedModels.length}) لم تُرجع رداً. يرجى المحاولة مرة أخرى.`, triedModels, errors },
        { status: 503 }
      );
    }

    const parsed = parseAIResponse(reply);
    if (parsed && parsed.result && parsed.score !== undefined) {
      return NextResponse.json({
        ...parsed,
        aiPowered: true,
        model: usedModelConfig!.id,
        modelLabel: usedModelConfig!.label,
        tier: usedModelConfig!.tier,
        triedModels,
        rawReport: parsed.report || "",
      });
    }

    return NextResponse.json({
      result: "needs_review",
      score: 50,
      summary: "تم تحليل الوثيقة لكن تعذّر تنسيق النتائج تلقائياً",
      report: reply,
      aiPowered: true,
      model: usedModelConfig!.id,
      modelLabel: usedModelConfig!.label,
      tier: usedModelConfig!.tier,
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
