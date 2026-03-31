import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "models/gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/* ─────────────────────── موجّه النظام ─────────────────────── */

const SYSTEM_PROMPT = `أنت خبير قانوني جزائري متخصص في تلخيص المستندات القانونية وتحليلها.

مهمتك: قراءة المستند القانوني المقدم وتلخيصه بأسلوب دقيق واستخراج أهم المعلومات منه.

تعليمات التلخيص:
1. اقرأ المستند كاملاً بعناية
2. حدد نوع المستند (حكم قضائي، عقد، مذكرة، شكوى، قانون، لائحة، عريضة، وثيقة إدارية...)
3. لخّص المحتوى في 5 إلى 7 أسطر واضحة تغطي الجوهر
4. استخرج النقاط القانونية الأساسية
5. حدد الأطراف المذكورة إن وجدوا
6. استخرج التواريخ المهمة
7. اذكر المراجع القانونية (مواد، قوانين، مراسيم) المذكورة في المستند
8. حدد الإجراءات أو الالتزامات المطلوبة

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
تنسيق الإجابة — JSON فقط:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

أجب فقط بكائن JSON صالح بالضبط بهذا الهيكل (بدون أي نص إضافي أو شرح أو markdown):

{
  "title": "عنوان أو اسم مناسب للمستند",
  "type": "نوع المستند (حكم/عقد/مذكرة/شكوى/قانون/لائحة/عريضة/وثيقة إدارية/أخرى)",
  "summary": "ملخص المستند في 5 إلى 7 أسطر واضحة ومفيدة تغطي المحتوى الأساسي بشكل كامل",
  "keyPoints": ["النقطة القانونية الأساسية الأولى", "النقطة الثانية", "النقطة الثالثة"],
  "parties": ["الطرف الأول المذكور", "الطرف الثاني المذكور"],
  "dates": ["التاريخ المهم الأول وما يتعلق به", "التاريخ الثاني"],
  "legalReferences": ["المادة أو القانون الأول المذكور", "المرجع الثاني"],
  "actionItems": ["الإجراء أو الالتزام الأول المطلوب", "الإجراء الثاني"]
}

قواعد مهمة:
- أجب فقط بـ JSON صالح. لا تضع أي نص قبل أو بعد الكائن.
- لا تستخدم \`\`\`json أو أي تنسيق markdown.
- كل النصوص يجب أن تكون بالعربية.
- إذا لم تجد معلومة ما (أطراف، تواريخ، مراجع...) استخدم مصفوفة فارغة [].
- كن دقيقاً ولا تختلق معلومات غير موجودة في المستند.
- الملخص يجب أن يكون مفيداً وشاملاً ويعكس المحتوى الحقيقي للمستند.`;

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
        { error: "لم يتم تقديم نص المستند أو ملف PDF" },
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
        text: `هذا هو المستند القانوني المطلوب تلخيصه. قم بتلخيصه وفق التعليمات المذكورة وأرجع النتيجة بصيغة JSON فقط.`,
      });
    } else if (text) {
      userParts.push({
        text: `هذا هو نص المستند القانوني المطلوب تلخيصه:\n\n---\n${text}\n---\n\nقم بتلخيص هذا المستند وفق التعليمات المذكورة وأرجع النتيجة بصيغة JSON فقط.`,
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
        temperature: 0.3,
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 4096,
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
            `خطأ في الاتصال بخدمة التلخيص (HTTP ${response.status})`,
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
        { error: "لم ترجع خدمة التلخيص أي نتيجة. يرجى المحاولة مرة أخرى." },
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
          error: "تعذّر قراءة نتيجة التلخيص. يرجى المحاولة مرة أخرى.",
          raw: rawText.slice(0, 1000),
        },
        { status: 500 }
      );
    }

    if (!parsed.summary || !parsed.type) {
      return NextResponse.json(
        { error: "نتيجة التلخيص غير مكتملة. يرجى المحاولة مرة أخرى." },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary: parsed });
  } catch (err) {
    console.error("Server Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
