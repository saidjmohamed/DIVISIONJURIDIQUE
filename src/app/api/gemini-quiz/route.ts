import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { topic, difficulty, count } = await request.json();

    if (!topic || !difficulty || !count) {
      return NextResponse.json(
        { error: 'يرجى تحديد الموضوع والمستوى وعدد الأسئلة' },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'لم يتم تهيئة مفتاح API' },
        { status: 500 }
      );
    }

    const prompt = `أنت خبير في القانون الجزائري. قم بإنشاء اختبار عن "${topic}" بمستوى "${difficulty}".
أنشئ ${count} أسئلة اختيار من متعدد (4 خيارات لكل سؤال).
مع الإجابة الصحيحة وشرح مختصر لكل سؤال.

أجب بصيغة JSON فقط:
{
  "questions": [
    {
      "id": 1,
      "question": "نص السؤال",
      "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
      "correctAnswer": 0,
      "explanation": "شرح الإجابة"
    }
  ]
}

ملاحظات:
- correctAnswer هو فهرس الخيار الصحيح (0-3)
- اجعل الأسئلة متنوعة وتغطي جوانب مختلفة من الموضوع
- الشرح يجب أن يكون مختصراً ومفيداً
- استخدم لغة عربية فصيحة`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Quiz generation error:', errorData);
      return NextResponse.json(
        { error: 'فشل في توليد الاختبار' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: 'لم يتم توليد أي محتوى' },
        { status: 500 }
      );
    }

    // Parse JSON - handle potential markdown code block wrapping
    let quizData;
    try {
      quizData = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      quizData = JSON.parse(cleaned);
    }

    return NextResponse.json(quizData);
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { error: 'فشل في توليد الاختبار. يرجى المحاولة مرة أخرى.' },
      { status: 500 }
    );
  }
}
