import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════
// أداة التحقق الشكلي بالذكاء الاصطناعي — OpenRouter with Smart Fallback
// ═══════════════════════════════════════════════════════════════════════════

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type DocumentType = "opening" | "appeal" | "complaint_regular" | "complaint_civil" | "complaint_direct";

// ─── Legal Articles Reference ───

const OPENING_PETITION_ARTICLES = `
## الشروط الشكلية للعريضة الافتتاحية (المستوى الابتدائي) — قانون الإجراءات المدنية والإدارية 08-09:

### المادة 14 — شروط عامة:
ترفع الدعوى بعريضة مكتوبة موقعة ومؤرخة تودع بأمانة الضبط من قبل المدعي أو وكيله أو محاميه بعدد من النسخ يساوي عدد الأطراف.

### المادة 15 — البيانات الإلزامية تحت طائلة عدم القبول شكلاً:
1. الجهة القضائية التي ترفع أمامها الدعوى
2. اسم ولقب وموطن المدعي
3. اسم ولقب وموطن المدعى عليه
4. عرض موجز للوقائع والطلبات والوسائل
5. الإشارة إلى المستندات والوثائق المؤيدة

### المادة 13 — شروط قبول الدعوى: الصفة، المصلحة، الإذن
### المادة 10 — التمثيل بمحامٍ
### المادة 17 — شهر العريضة (إذا تعلق بعقار)
### المادة 65 — الأهلية
`;

const APPEAL_PETITION_ARTICLES = `
## الشروط الشكلية للعريضة الاستئنافية:
### المادة 539 — شروط عامة
### المادة 540 — البيانات الإلزامية
### المادة 541 — إرفاق الحكم المستأنف
### المادة 336 — أجل الاستئناف (شهر)
### المادة 538 — التمثيل بمحامٍ وجوبي
`;

const COMPLAINT_REGULAR_ARTICLES = `
## الشروط الشكلية للشكوى العادية — ق.إ.ج:
### المادة 36 — البيانات الأساسية
### المادة 37 — صلاحيات وكيل الجمهورية
`;

const COMPLAINT_CIVIL_PARTY_ARTICLES = `
## الشروط الشكلية للشكوى مع الادعاء المدني — ق.إ.ج:
### المادة 72 — شروط الشكوى مع الادعاء المدني
### المادة 73 — شرط عدم الحفظ السابق
### المادة 75 — إيداع الكفالة المالية
`;

const COMPLAINT_DIRECT_ARTICLES = `
## الشروط الشكلية للتكليف المباشر — ق.إ.ج:
### المادة 337 مكرر — شروط التكليف المباشر
`;

const DOC_TYPE_ARTICLES: Record<DocumentType, string> = {
  opening: OPENING_PETITION_ARTICLES,
  appeal: APPEAL_PETITION_ARTICLES,
  complaint_regular: COMPLAINT_REGULAR_ARTICLES,
  complaint_civil: COMPLAINT_CIVIL_PARTY_ARTICLES,
  complaint_direct: COMPLAINT_DIRECT_ARTICLES,
};

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  opening: "عريضة افتتاحية",
  appeal: "عريضة استئنافية",
  complaint_regular: "شكوى عادية",
  complaint_civil: "شكوى مع ادعاء مدني",
  complaint_direct: "تكليف مباشر",
};

// ─── Model Fallback Chain (same as /api/ai) ───

const FALLBACK_MODELS = [
  { id: "qwen/qwen3.6-plus-preview:free", label: "Qwen 3.6 Plus" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super" },
  { id: "minimax/minimax-m2.5:free", label: "MiniMax M2.5" },
  { id: "stepfun/step-3.5-flash:free", label: "Step 3.5 Flash" },
  { id: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B" },
  { id: "arcee-ai/trinity-large-preview:free", label: "Arcee Trinity" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B" },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", label: "Qwen3 Next 80B" },
  { id: "z-ai/glm-4.5-air:free", label: "GLM 4.5 Air" },
  { id: "nvidia/nemotron-nano-9b-v2:free", label: "Nemotron Nano 9B" },
];

// ─── System Prompt ───

function buildSystemPrompt(docType: DocumentType): string {
  const articles = DOC_TYPE_ARTICLES[docType];
  const docLabel = DOC_TYPE_LABELS[docType];

  return `أنت خبير قانوني جزائري متخصص في التحقق الشكلي من الوثائق القضائية.

## مهمتك:
أنت تحلل "${docLabel}" وتراجع استيفاء الشروط الشكلية وفقاً للقانون الجزائري.

${articles}

## طريقة العمل:
1. راجع كل شرط شكلي على حدة
2. حدد ما إذا كان الشرط مستوفى (pass) أو مفقود (fail) أو يحتاج مراجعة (warning) أو غير متوفر (not_found)
3. صنّف الشروط الجوهرية (critical) وغير الجوهرية
4. قدّم ملخصاً وتوصيات عملية

## قواعد مهمة:
- كن دقيقاً في تحديد المواد القانونية
- لا تخلق معلومات غير موجودة في النص
- إذا لم تستطع تحديد شرط معين ضعه not_found
- الشرط الجوهري (critical) هو الذي يؤدي عدم توفره إلى رفض العريضة شكلاً
- اجعل التوصيات عملية ومحددة

## التنسيق المطلوب:
أجب بصيغة JSON فقط بدون أي نص إضافي أو markdown أو backticks.
يجب أن يكون JSON صالحاً ويمكن تحليله بـ JSON.parse().`;
}

// ─── User Prompt ───

function buildUserPrompt(text: string, docType: DocumentType): string {
  return `قم بتحليل الوثيقة التالية من حيث استيفاء الشروط الشكلية كـ"${DOC_TYPE_LABELS[docType]}".

## نص الوثيقة:
---
${text.slice(0, 8000)}
---

أجب بصيغة JSON التالية فقط (بدون أي نص إضافي):
{
  "result": "accepted" أو "rejected" أو "needs_review",
  "score": رقم من 0 إلى 100,
  "checks": [
    {
      "id": "معرف_الشرط_بالإنجليزية",
      "label": "اسم الشرط بالعربية",
      "article": "رقم المادة والقانون",
      "status": "pass" أو "fail" أو "warning" أو "not_found",
      "critical": true أو false,
      "details": "شرح مفصل بالعربية"
    }
  ],
  "summary": "ملخص شامل بالعربية",
  "recommendations": ["توصية 1", "توصية 2"]
}

قواعد النتيجة:
- accepted: إذا كانت جميع الشروط الجوهرية مستوفاة والنقطة ≥ 80
- rejected: إذا كان هناك شرط جوهري واحد على الأقل مفقود (status: fail)
- needs_review: إذا لم تكن هناك شروط جوهرية مفقودة لكن النقطة < 80

مهم: أجب بـ JSON فقط بدون أي نص قبله أو بعده. لا تستخدم markdown code blocks.`;
}

// ─── OpenRouter Call ───

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

async function callModel(
  messages: ChatMessage[],
  modelId: string,
  timeoutMs: number = 45000
): Promise<{ content: string | null; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hiyaat-dz.vercel.app",
        "X-Title": "الشامل القانوني - التحقق الشكلي",
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        max_tokens: 4096,
        temperature: 0.3, // Lower for more consistent legal analysis
      }),
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

// ─── Parse AI Response ───

interface AIAnalysisResult {
  result: "accepted" | "rejected" | "needs_review";
  score: number;
  checks: {
    id: string;
    label: string;
    article: string;
    status: "pass" | "fail" | "warning" | "not_found";
    critical: boolean;
    details: string;
  }[];
  summary: string;
  recommendations: string[];
}

function parseAIResponse(raw: string): AIAnalysisResult | null {
  try {
    // Try direct parse first
    let cleaned = raw.trim();

    // Remove markdown code blocks if present
    const jsonBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlock) {
      cleaned = jsonBlock[1].trim();
    }

    // Remove any leading/trailing non-JSON text
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleaned);

    // Validate required fields
    if (!parsed.result || !parsed.score || !parsed.checks || !parsed.summary) {
      return null;
    }

    // Normalize result
    if (!["accepted", "rejected", "needs_review"].includes(parsed.result)) {
      return null;
    }

    // Normalize score
    parsed.score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));

    // Normalize checks
    if (!Array.isArray(parsed.checks)) return null;
    parsed.checks = parsed.checks.map((c: Record<string, unknown>, i: number) => ({
      id: String(c.id || `check_${i}`),
      label: String(c.label || `شرط ${i + 1}`),
      article: String(c.article || ""),
      status: ["pass", "fail", "warning", "not_found"].includes(c.status) ? c.status : "not_found",
      critical: Boolean(c.critical),
      details: String(c.details || ""),
    }));

    // Normalize recommendations
    if (!Array.isArray(parsed.recommendations)) {
      parsed.recommendations = [];
    }
    parsed.recommendations = parsed.recommendations.map(String);

    return parsed as AIAnalysisResult;
  } catch {
    return null;
  }
}

// ─── Main Handler ───

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { error: "مفتاح API غير مضبوط. يرجى إعداد OPENROUTER_API_KEY.", fallback: true },
      { status: 500 }
    );
  }

  try {
    const { text, petitionType } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "نص المستند فارغ" },
        { status: 400 }
      );
    }

    if (!petitionType || !DOC_TYPE_ARTICLES[petitionType as DocumentType]) {
      return NextResponse.json(
        { error: "نوع المستند غير صالح" },
        { status: 400 }
      );
    }

    const docType = petitionType as DocumentType;
    const systemPrompt = buildSystemPrompt(docType);
    const userPrompt = buildUserPrompt(text, docType);
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    let result: AIAnalysisResult | null = null;
    let usedModel = "";
    const errors: string[] = [];

    // Try models sequentially with fallback
    for (const model of FALLBACK_MODELS) {
      const response = await callModel(messages, model.id, 45000);

      if (response.content) {
        const parsed = parseAIResponse(response.content);
        if (parsed) {
          result = parsed;
          usedModel = model.id;
          break;
        } else {
          errors.push(`${model.label}: JSON غير صالح`);
        }
      } else if (response.error) {
        errors.push(`${model.label}: ${response.error}`);
      }
    }

    if (!result) {
      return NextResponse.json(
        {
          error: `لم يتم الحصول على نتيجة صالحة من نماذج الذكاء الاصطناعي. يرجى المحاولة مرة أخرى أو استخدام التحقق المحلي.`,
          errors,
          fallback: true,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ...result,
      aiPowered: true,
      model: usedModel,
    });
  } catch (err) {
    console.error("Petition Check API Error:", err);
    return NextResponse.json(
      { error: String(err), fallback: true },
      { status: 500 }
    );
  }
}
