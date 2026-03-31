import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "models/gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/* ─────────────────────── الأنواع ─────────────────────── */

interface MemoInput {
  memoType: string;       // نوع المذكرة
  court: string;          // اسم المحكمة
  plaintiff: string;      // المدعي / الطاعن
  defendant: string;      // المدعى عليه / المطعون ضده
  facts: string;          // ملخص الوقائع
  requests: string;       // الطلبات
  legalBasis?: string;    // الأسانيد القانونية (اختياري)
  lawyerName?: string;    // اسم المحامي (اختياري)
}

/* ─────────────────────── موجّه النظام ─────────────────────── */

function buildSystemPrompt(input: MemoInput): string {
  const memoTypeLabels: Record<string, string> = {
    response: "مذكرة جوابية",
    closing: "مذكرة ختامية",
    appeal_cassation: "مذكرة طعن بالنقض",
    appeal: "مذكرة استئناف",
    objection: "مذكرة معارضة",
    opening: "مذكرة افتتاحية",
  };
  const memoLabel = memoTypeLabels[input.memoType] ?? "مذكرة قانونية";

  return `أنت محامٍ جزائري خبير متخصص في صياغة المذكرات القانونية أمام المحاكم الجزائرية.

مهمتك: صياغة ${memoLabel} كاملة باللغة العربية الفصحى وفق الأسلوب القانوني الجزائري المعتمد في الإجراءات القضائية.

المعلومات المقدمة:
- نوع المذكرة: ${memoLabel}
- المحكمة: ${input.court}
- المدعي / الطاعن: ${input.plaintiff}
- المدعى عليه / المطعون ضده: ${input.defendant}
- ملخص الوقائع: ${input.facts}
- الطلبات: ${input.requests}
- الأسانيد القانونية: ${input.legalBasis || "يُرجى استنباطها من السياق"}
- المحامي: ${input.lawyerName || "المحامي"}

تعليمات الصياغة:
1. ابدأ بالترويسة الرسمية الكاملة (اسم المحكمة، رقم القضية إن وُجد، التاريخ)
2. استخدم الأسلوب القانوني الجزائري الرسمي (حيث أن، ولما كان، وبالبناء على)
3. قسّم المذكرة إلى أقسام واضحة: الوقائع، الأسانيد القانونية، طلبات الختام
4. استند إلى مواد القانون الجزائري المناسبة
5. اختم بعبارة "وبناءً على ما سبق يلتمس المحامي من المحكمة الموقرة..."
6. يجب أن تكون المذكرة قابلة للاستخدام مباشرة بعد مراجعة المحامي

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
تنسيق الإجابة — JSON فقط:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

أجب فقط بكائن JSON صالح بالضبط بهذا الهيكل (بدون أي نص إضافي أو شرح أو markdown):

{
  "title": "عنوان المذكرة الرسمي",
  "header": "الترويسة الكاملة للمذكرة (اسم المحكمة، الطرفان، التاريخ)",
  "body": "نص المذكرة الكامل والمفصل مقسماً إلى أقسام (وقائع — أسانيد قانونية — حجج الدفاع)",
  "conclusion": "خاتمة المذكرة والطلبات الختامية",
  "legalBasis": ["المادة أو القانون المستند إليه الأول", "المرجع الثاني"]
}

قواعد مهمة:
- أجب فقط بـ JSON صالح. لا تضع أي نص قبل أو بعد الكائن.
- لا تستخدم \`\`\`json أو أي تنسيق markdown.
- كل النصوص يجب أن تكون بالعربية الفصحى.
- النص يجب أن يكون كاملاً ومفصلاً وقابلاً للاستخدام الفعلي.
- استخدم صيغة المذكرات القانونية الجزائرية المعتمدة.
- اذكر على الأقل 3 إلى 5 مواد قانونية مناسبة لنوع المذكرة.
- احرص على الدقة القانونية والصياغة السليمة.`;
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
    const {
      memoType,
      court,
      plaintiff,
      defendant,
      facts,
      requests,
      legalBasis,
      lawyerName,
    } = body as MemoInput;

    // Validate required fields
    if (!memoType || !court || !plaintiff || !defendant || !facts || !requests) {
      return NextResponse.json(
        { error: "يرجى تعبئة جميع الحقول الإلزامية (نوع المذكرة، المحكمة، الأطراف، الوقائع، الطلبات)" },
        { status: 400 }
      );
    }

    const input: MemoInput = { memoType, court, plaintiff, defendant, facts, requests, legalBasis, lawyerName };
    const systemPrompt = buildSystemPrompt(input);

    const geminiBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `قم بصياغة المذكرة القانونية المطلوبة بناءً على المعلومات المقدمة وأرجع النتيجة بصيغة JSON فقط.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 30,
        topP: 0.95,
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
            `خطأ في الاتصال بخدمة الصياغة (HTTP ${response.status})`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Gemini 2.5 Flash thinking mode handling
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
        { error: "لم ترجع خدمة الصياغة أي نتيجة. يرجى المحاولة مرة أخرى." },
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
          error: "تعذّر قراءة نتيجة الصياغة. يرجى المحاولة مرة أخرى.",
          raw: rawText.slice(0, 1000),
        },
        { status: 500 }
      );
    }

    if (!parsed.body || !parsed.title) {
      return NextResponse.json(
        { error: "نتيجة الصياغة غير مكتملة. يرجى المحاولة مرة أخرى." },
        { status: 500 }
      );
    }

    return NextResponse.json({ memo: parsed });
  } catch (err) {
    console.error("Server Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
