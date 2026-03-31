import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "models/gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/* ─────────────────────── موجّه النظام ─────────────────────── */

function buildSystemPrompt(contractType: string): string {
  const contractTypeLabel: Record<string, string> = {
    sale: "عقد بيع",
    rent: "عقد إيجار",
    work: "عقد عمل",
    company: "عقد شركة",
    property: "عقد عقاري",
    general: "عقد (نوع غير محدد)",
  };
  const label = contractTypeLabel[contractType] ?? "عقد";

  return `أنت خبير قانوني جزائري متخصص في مراجعة العقود وفقاً للقانون المدني الجزائري (الأمر 75-58 المعدل والمتمم).

مهمتك: فحص ${label} المقدم وتحليله تحليلاً قانونياً دقيقاً للكشف عن أي إشكاليات أو مخاطر قانونية.

المواد القانونية الواجب التحقق منها:

### أركان العقد (م.54 ق.م):
- التراضي: هل تم التعبير عن إرادة الطرفين بوضوح؟
- المحل: هل موضوع العقد موجود ومعين ومشروع؟ (م.92-96)
- السبب: هل سبب العقد موجود ومشروع؟ (م.97-98)

### الأهلية (م.71 ق.م):
- يشترط بلوغ 19 سنة لإبرام العقود
- التحقق من صفة الممثل القانوني للأشخاص المعنوية

### عيوب الإرادة (م.59-61 ق.م):
- الغلط: هل توجد أخطاء جوهرية؟ (م.59)
- التدليس: هل يوجد تضليل أو غش؟ (م.60)
- الإكراه: هل يوجد إجبار أو تهديد؟ (م.61)
- الاستغلال: هل هناك استغلال لحاجة أو ضعف أحد الطرفين؟ (م.90)

### مبدأ سلطان الإرادة (م.106 ق.م):
- العقد شريعة المتعاقدين — هل البنود واضحة وملزمة؟

### حسن النية (م.107 ق.م):
- هل يُلزم العقد بتنفيذ متطلبات حسن النية؟

### الشروط التعسفية والإذعان (م.110-119 ق.م):
- هل توجد شروط مجحفة أو تعسفية ضد أحد الطرفين؟
- هل العقد عقد إذعان يحتاج مراجعة خاصة؟

### الشكلية في العقود العقارية (م.324 مكرر 1 ق.م):
- ${contractType === "property" ? "يشترط التوثيق الرسمي تحت طائلة البطلان — هل تمت الإشارة للتوثيق؟" : "ليست عقداً عقارياً — لا يشترط التوثيق الرسمي بالضرورة"}

### بنود الضمان والمسؤولية:
- هل يوجد نص على الضمان؟
- هل تحديد المسؤولية عادل؟
- هل يوجد نص على حل النزاعات؟

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
تنسيق الإجابة — JSON فقط:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

أجب فقط بكائن JSON صالح بالضبط بهذا الهيكل (بدون أي نص إضافي أو شرح أو markdown):

{
  "contractType": "نوع العقد",
  "parties": [
    {"name": "اسم الطرف الأول", "role": "دوره في العقد (بائع/مشتري/مؤجر/مستأجر...)"}
  ],
  "result": "valid",
  "score": 85,
  "checks": [
    {
      "id": "consent",
      "label": "التراضي — م.54 ق.م",
      "article": "م.54 ق.م",
      "status": "pass",
      "critical": true,
      "details": "تفاصيل ما وجدته في العقد بشأن هذا الشرط"
    }
  ],
  "missingClauses": ["بند مفقود يُنصح بإضافته"],
  "risks": ["خطر قانوني محتمل"],
  "summary": "ملخص عام لنتيجة مراجعة العقد",
  "recommendations": ["توصية عملية للمحامي"]
}

قواعد مهمة:
- result يكون: "valid" (عقد سليم)، "has_issues" (يوجد إشكاليات بسيطة)، "major_issues" (إشكاليات جوهرية)
- score من 0 إلى 100 بناءً على نسبة استيفاء الشروط القانونية
- أجب فقط بـ JSON صالح. لا تضع أي نص قبل أو بعد الكائن.
- لا تستخدم \`\`\`json أو أي تنسيق markdown.
- كل النصوص يجب أن تكون بالعربية.
- كن دقيقاً ومحايداً ولا تختلق بيانات غير موجودة في نص العقد.`;
}

/* ─────────────────────── معالج الطلب ─────────────────────── */

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "مفتاح Gemini غير مضبوط. يرجى إضافة GEMINI_API_KEY في إعدادات المشروع." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { text, pdfBase64, contractType = "general" } = body as {
      text?: string;
      pdfBase64?: string;
      contractType?: string;
    };

    if (!text && !pdfBase64) {
      return NextResponse.json(
        { error: "لم يتم تقديم نص العقد أو ملف PDF" },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(contractType);

    // Build the user content parts
    const userParts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [];

    if (pdfBase64) {
      userParts.push({
        inline_data: {
          mime_type: "application/pdf",
          data: pdfBase64,
        },
      });
      userParts.push({
        text: `هذا هو العقد المطلوب مراجعته. قم بمراجعته وفق التعليمات المذكورة وأرجع النتيجة بصيغة JSON فقط.`,
      });
    } else if (text) {
      userParts.push({
        text: `هذا هو نص العقد المطلوب مراجعته:\n\n---\n${text}\n---\n\nقم بمراجعة هذا العقد وفق التعليمات المذكورة وأرجع النتيجة بصيغة JSON فقط.`,
      });
    }

    const geminiBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: userParts,
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      ],
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Gemini API Error:", err);
      return NextResponse.json(
        {
          error:
            (err as { error?: { message?: string } })?.error?.message ??
            `خطأ في الاتصال بخدمة التحليل (HTTP ${response.status})`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Gemini 2.5 Flash uses "thinking" mode — the response may have multiple parts
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    let rawText = "";
    for (const part of parts) {
      if (part.text && !part.thought) {
        rawText = part.text;
      }
    }
    if (!rawText && parts.length > 0) {
      rawText = parts[parts.length - 1]?.text ?? parts[0]?.text ?? "";
    }

    if (!rawText) {
      console.error("Gemini returned no text. Full response:", JSON.stringify(data).slice(0, 1000));
      return NextResponse.json(
        { error: "لم ترجع خدمة التحليل أي نتيجة. يرجى المحاولة مرة أخرى." },
        { status: 500 }
      );
    }

    let cleaned = rawText.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini JSON. Raw text (first 800 chars):", rawText.slice(0, 800));
      return NextResponse.json(
        {
          error: "تعذّر قراءة نتيجة التحليل. يرجى المحاولة مرة أخرى.",
          raw: rawText.slice(0, 1000),
        },
        { status: 500 }
      );
    }

    if (!parsed.result || !Array.isArray(parsed.checks)) {
      return NextResponse.json(
        { error: "نتيجة المراجعة غير مكتملة. يرجى المحاولة مرة أخرى." },
        { status: 500 }
      );
    }

    return NextResponse.json({ analysis: parsed });
  } catch (err) {
    console.error("Server Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
