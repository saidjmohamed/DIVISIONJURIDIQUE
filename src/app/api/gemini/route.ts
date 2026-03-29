import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL   = "models/gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `أنت مساعد قانوني متخصص في القانون الجزائري، مدمج في تطبيق "شامل" للاختصاص القضائي.

معرفتك تشمل:
- قانون الإجراءات المدنية والإدارية (القانون 08-09)
- قانون الإجراءات الجزائية (الأمر 66-155 المعدل)
- قانون الأسرة الجزائري
- القانون التجاري الجزائري
- القانون البحري الجزائري
- المرسوم التنفيذي 22-435 المحدد لدوائر الاختصاص الإقليمي
- الهيكل القضائي الجزائري: المجالس القضائية، المحاكم الابتدائية، المحاكم الإدارية، المحاكم التجارية

قواعد الرد:
1. أجب باللغة العربية الفصحى دائماً
2. كن دقيقاً في المصادر: اذكر رقم المادة والنص القانوني
3. إذا كان السؤال عن اختصاص محكمة معينة، استند للمرسوم 22-435
4. نبّه دائماً: "هذا للإرشاد القانوني فقط، استشر محامياً للحالات الخاصة"
5. إذا لم تعرف الجواب بيقين، قل ذلك بوضوح
6. اجعل ردودك منظمة: عناوين واضحة، نقاط مرتبة`;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY غير موجود في ملف .env.local" },
      { status: 500 }
    );
  }

  try {
    const { messages, userMessage } = await req.json();

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });
    }

    // بناء سجل المحادثة لـ Gemini
    const contents = [];

    // إضافة السياق السابق (آخر 10 رسائل)
    if (messages && Array.isArray(messages)) {
      const recent = messages.slice(-10);
      for (const msg of recent) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // إضافة رسالة المستخدم الحالية
    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const body = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents,
      generationConfig: {
        temperature:     0.7,
        topK:            40,
        topP:            0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      ],
    };

    const response = await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Gemini API Error:", err);
      return NextResponse.json(
        { error: err?.error?.message ?? `HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json({ error: "لم يرجع الـ AI أي نص" }, { status: 500 });
    }

    return NextResponse.json({ reply: text });

  } catch (err) {
    console.error("Server Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
