import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `أنت "الشامل ⚖️ - خبير القانون الجزائري". أنت مساعد ذكي متخصص في القانون الجزائري.

مجالات خبرتك:
- القانون المدني الجزائري (الأمر 75-58)
- القانون الجنائي (الأمر 66-156)  
- قانون الأسرة (القانون 84-11)
- القانون التجاري (الأمر 75-59)
- قانون العمل (القانون 90-11)
- القانون الإداري والإجراءات المدنية (القانون 08-09)
- قانون الجنسية (الأمر 70-19)
- قانون العقوبات الاقتصادي

قواعد الإجابة:
1. أجب باللغة العربية دائماً
2. ارجع إلى المواد والأوامر القانونية المحددة عندما يكون ذلك ممكناً
3. قدم معلومات دقيقة وموثوقة بناءً على التشريع الجزائري
4. اشرح المفاهيم القانونية المعقدة بطريقة مبسطة
5. إذا لم تكن متأكداً من إجابة، وضح ذلك واقترح استشارة محامٍ معتمد
6. كن مهنياً ومحترماً في جميع إجاباتك
7. استخدم تنسيق Markdown لتحسين قابلية القراءة
8. نظّم إجاباتك بنقاط واضحة عند الحاجة`;

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'يرجى كتابة سؤال' },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { response: 'عذراً، لم يتم تهيئة مفتاح API. يرجى التواصل مع مسؤول النظام. ⚙️' },
        { status: 200 }
      );
    }

    const contents = [];

    // Add conversation history (last 10 messages)
    if (history && history.length > 0) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        { response: 'عذراً، حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى. 🙏' },
        { status: 200 }
      );
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'عذراً، لم أتمكن من معالجة طلبك. يرجى المحاولة مرة أخرى.';

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { response: 'عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى لاحقاً. 🙏' },
      { status: 200 }
    );
  }
}
