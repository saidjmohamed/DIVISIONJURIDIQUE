import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "models/gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/* ─────────────────────── موجّه النظام ─────────────────────── */

const SYSTEM_PROMPT = `أنت خبير قانوني جزائري متخصص في تحليل الأحكام القضائية الجزائرية.

مهمتك: قراءة نص الحكم القضائي المقدم وتحليله تحليلاً قانونياً دقيقاً واستخراج جميع المعلومات الأساسية منه.

قانون الإجراءات المدنية والإدارية (08-09) — مواد الطعون:
- الاستئناف: أجل شهر واحد من تاريخ التبليغ الرسمي (م.336 ق.إ.م.إ) — يُقدَّم للمجلس القضائي
- الطعن بالنقض: أجل شهران من تاريخ التبليغ الرسمي (م.354 ق.إ.م.إ) — يُقدَّم للمحكمة العليا
- المعارضة: أجل 10 أيام من التبليغ في الجنح والمخالفات، شهر في الأمور المدنية (م.327-328 ق.إ.م.إ) — ضد الأحكام الغيابية
- اعتراض الغير الخارج عن الخصومة: لا أجل محدد قانوناً، يُمارَس في أي وقت (م.380 ق.إ.م.إ) — للأطراف غير الممثلة
- التماس إعادة النظر: أجل شهران من العلم بالسبب الموجب (م.390 ق.إ.م.إ) — لأسباب محددة قانوناً

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
تعليمات التحليل:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. اقرأ الحكم بعناية تامة
2. استخرج جميع البيانات المطلوبة
3. حدد طرق الطعن المتاحة بناءً على نوع الحكم ودرجته والجهة المصدرة
4. قدم توصيات عملية للمحامي
5. حدد المواد القانونية المطبقة في الحكم

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
تنسيق الإجابة — JSON فقط:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

أجب فقط بكائن JSON صالح بالضبط بهذا الهيكل (بدون أي نص إضافي أو شرح أو markdown):

{
  "court": "الجهة القضائية المصدرة",
  "caseNumber": "رقم القضية",
  "date": "تاريخ الحكم",
  "parties": {
    "plaintiff": "اسم المدعي أو الطاعن",
    "defendant": "اسم المدعى عليه أو المطعون ضده"
  },
  "subject": "موضوع الدعوى أو النزاع",
  "facts": "ملخص وقائع القضية كما وردت في الحكم",
  "reasoning": "أسباب الحكم والحيثيات القانونية",
  "ruling": "منطوق الحكم (الجزء القاطع)",
  "legalBasis": ["المادة القانونية الأولى", "المادة القانونية الثانية"],
  "appealOptions": [
    {
      "type": "نوع الطعن",
      "deadline": "الأجل القانوني",
      "article": "المادة القانونية المستند إليها",
      "conditions": "شروط قبول هذا الطعن"
    }
  ],
  "keyPoints": ["النقطة القانونية الجوهرية الأولى", "النقطة الثانية"],
  "recommendations": ["التوصية الأولى للمحامي", "التوصية الثانية"]
}

قواعد مهمة:
- أجب فقط بـ JSON صالح. لا تضع أي نص قبل أو بعد الكائن.
- لا تستخدم \`\`\`json أو أي تنسيق markdown.
- كل النصوص يجب أن تكون بالعربية.
- إذا لم تجد معلومة ما، استخدم "غير مذكور" أو مصفوفة فارغة [] حسب النوع.
- حدد طرق الطعن المناسبة بناءً على درجة التقاضي ونوع الحكم:
  * إذا كان الحكم ابتدائياً: الاستئناف هو الطعن الرئيسي
  * إذا كان الحكم استئنافياً: الطعن بالنقض هو الطعن الرئيسي
  * إذا كان الحكم غيابياً: المعارضة متاحة
  * دائماً: التماس إعادة النظر واعتراض الغير الخارج عن الخصومة حسب الحالة
- كن دقيقاً ومحايداً في التحليل ولا تختلق بيانات غير موجودة.`;

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
    const { text, pdfBase64 } = body as {
      text?: string;
      pdfBase64?: string;
    };

    if (!text && !pdfBase64) {
      return NextResponse.json(
        { error: "لم يتم تقديم نص الحكم أو ملف PDF" },
        { status: 400 }
      );
    }

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
        text: `هذا هو الحكم القضائي المطلوب تحليله. قم بتحليله وفق التعليمات المذكورة وأرجع النتيجة بصيغة JSON فقط.`,
      });
    } else if (text) {
      userParts.push({
        text: `هذا هو نص الحكم القضائي المطلوب تحليله:\n\n---\n${text}\n---\n\nقم بتحليل هذا الحكم وفق التعليمات المذكورة وأرجع النتيجة بصيغة JSON فقط.`,
      });
    }

    const geminiBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
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
    // The actual text is in the part where thought !== true
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    let rawText = "";
    for (const part of parts) {
      if (part.text && !part.thought) {
        rawText = part.text;
      }
    }
    // Fallback: if no non-thought part found, try the last part or first part
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

    // Parse JSON — handle markdown wrapping and extra text
    let cleaned = rawText.trim();

    // Remove ```json ... ``` wrapper
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");

    // If there's text before the JSON object, extract just the JSON
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

    // Validate basic structure
    if (!parsed.ruling && !parsed.court) {
      return NextResponse.json(
        { error: "نتيجة التحليل غير مكتملة. يرجى المحاولة مرة أخرى." },
        { status: 500 }
      );
    }

    return NextResponse.json({ analysis: parsed });
  } catch (err) {
    console.error("Server Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
