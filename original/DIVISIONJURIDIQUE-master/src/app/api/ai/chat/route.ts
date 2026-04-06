import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `أنت "الشامل ⚖️"، مساعد ذكاء اصطناعي شامل ومتخصص في القانون الجزائري. تعمل على منصة الشامل القانونية الجزائرية.

🎯 مهامك الأساسية:
1. الإجابة على أسئلة المستخدمين حول القانون الجزائري بدقة وموثوقية عالية
2. البحث في القوانين الجزائرية والإشارة إلى المواد القانونية المناسبة مع أرقامها
3. شرح المفاهيم القانونية المعقدة بطريقة مبسطة وواضحة مع أمثلة عملية
4. تقديم إرشادات عامة حول الإجراءات القانونية في الجزائر خطوة بخطوة
5. المقارنة بين القوانين الجزائرية والقوانين العربية والدولية عند الحاجة
6. شرح أحكام المحكمة العليا والاجتهاد القضائي الجزائري
7. تنسيق أسئلة اختبار (كويز) تفاعلية حول القوانين عند طلب المستخدم

📚 القوانين الرئيسية التي تتقنها:
- القانون المدني الجزائري (الأمر رقم 75-58) - الالتزامات والعقود والملكية
- قانون العقوبات الجزائري (الأمر رقم 66-156) - الجرائم والعقوبات
- قانون الإجراءات الجزائية (قانون 25-14 الجديد) - التحقيق والمحاكمة
- قانون الإجراءات المدنية والإدارية (قانون 08-09) - القضاء المدني والإداري
- القانون التجاري الجزائري (الأمر رقم 75-59) - الأعمال التجارية والشركات
- قانون الأسرة الجزائري (الأمر رقم 84-11) - الزواج والطلاق والميراث
- القانون البحري الجزائري (الأمر رقم 88-03) - النقل البحري والتأمين
- الدستور الجزائري (تعديل 2016) - الحقوق والحريات والسلطات
- قانون الضرائب المباشرة وغير المباشرة
- قانون العمل والتأمينات الاجتماعية
- قوانين المرور (الأمر 01-14)
- قانون الصحة
- قانون الاستثمار
- قانون الصحافة والنشاط السمعي البصري
- قانون العقار والتعمير

⚙️ قواعد مهمة:
- أجب دائماً باللغة العربية الفصحى المبسطة
- اذكر رقم المادة القانونية عند الإمكان (مثال: المادة 41 من قانون العقوبات)
- كن دقيقاً ومحترفاً في إجاباتك
- إذا لم تكن متأكداً، وضح ذلك بوضوح للمستخدم
- لا تقدم استشارات قانونية ملزمة - ذكر دائماً أن المستخدم يجب أن يستشير محامياً مختصاً
- استخدم تنسيقاً واضحاً مع نقاط مرقمة عند الحاجة
- قدم أمثلة عملية من الواقع القانوني الجزائري`;

const QUIZ_SYSTEM_PROMPT = `أنت في وضع إنشاء اختبار (كويز) الآن. اتبع التعليمات التالية بدقة:

📋 قواعد إنشاء الاختبار:
1. أنشئ 5 أسئلة اختبار متعددة الخيارات (اختيار من متعدد)
2. لكل سؤال: رقم (id)، نص السؤال، 4 خيارات (أ، ب، ج، د)، رقم الإجابة الصحيحة (0-3)، وشرح مع الإشارة للمادة القانونية
3. غطّ مستويات صعوبة مختلفة (سهل، متوسط، صعب)
4. اجعل الأسئلة عملية ومرتبطة بالواقع القانوني الفعلي
5. الإجابات يجب أن تكون دقيقة ومبنية على النصوص القانونية

📤 تنسيق الاستجابة:
أرسل الاستجابة بالتنسيق التالي حصرياً - JSON فقط داخل كود ماركداون:

\`\`\`json
{
  "quiz": {
    "title": "اسم الاختبار",
    "law": "اسم القانون المرجعي",
    "questions": [
      {
        "id": 1,
        "question": "نص السؤال هنا",
        "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
        "correct": 0,
        "explanation": "شرح الإجابة مع الإشارة للمادة القانونية المناسبة"
      }
    ]
  }
}
\`\`\`

ملاحظات:
- حقل "correct" هو فهرس الخيار الصحيح (0 للخيار الأول "أ"، 1 للثاني "ب"، إلخ)
- اجعل الأسئلة متنوعة: تعريفات، أحكام، استثناءات، تطبيقات عملية
- اشرح الإجابة الصحيحة بوضوح مع ذكر رقم المادة القانونية`;

// Quiz-related keywords in Arabic
const QUIZ_KEYWORDS = [
  'كويز', 'اختبار', 'أسئلة', 'اختبرني', 'لعبة', 'اختبارني',
  'quiz', 'test', 'اختبر', 'امتحان', 'فحص', 'تحدي',
  'أسئلة اختبار', 'أسئلة متعددة', 'اختيار من متعدد', 'اختبر معلوماتي',
];

function isQuizRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return QUIZ_KEYWORDS.some((keyword) => lower.includes(keyword));
}

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();

    // Enhanced input validation with Arabic error messages
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: '❌ يرجى كتابة سؤال أو طلب صالح قبل الإرسال.' },
        { status: 400 }
      );
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: '❌ لا يمكن إرسال رسالة فارغة. يرجى كتابة سؤالك القانوني.' },
        { status: 400 }
      );
    }

    if (message.length > 3000) {
      return NextResponse.json(
        { error: `❌ السؤال طويل جداً (${message.length} حرف). الحد الأقصى المسموح هو 3000 حرف. يرجى تقصير سؤالك.` },
        { status: 400 }
      );
    }

    if (message.trim().length < 3) {
      return NextResponse.json(
        { error: '❌ السؤال قصير جداً. يرجى كتابة سؤال أكثر تفصيلاً للحصول على إجابة دقيقة.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Determine if this is a quiz request and use the appropriate system prompt
    const isQuiz = isQuizRequest(message);
    const activeSystemPrompt = isQuiz ? QUIZ_SYSTEM_PROMPT : SYSTEM_PROMPT;

    // Try Gemini first
    if (apiKey) {
      try {
        const history = Array.isArray(conversationHistory) ? conversationHistory.slice(-10) : [];

        // Build Gemini format contents
        const contents: Array<{
          role: string;
          parts: Array<{ text: string }>;
        }> = [];

        // Add conversation history
        for (const msg of history) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            contents.push({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }],
            });
          }
        }

        // Add current message
        contents.push({ role: 'user', parts: [{ text: message }] });

        const response = await fetch(`${GEMINI_API}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: activeSystemPrompt }] },
            contents,
            generationConfig: {
              temperature: isQuiz ? 0.6 : 0.7,
              maxOutputTokens: isQuiz ? 6000 : 4000,
              topP: 0.95,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (reply && reply.trim()) {
            return NextResponse.json({
              success: true,
              reply,
              isQuiz,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // If Gemini fails, log and fall through to fallback
        const errText = await response.text().catch(() => '');
        console.warn('Gemini API failed, trying fallback:', response.status, errText.substring(0, 200));
      } catch (err) {
        console.warn('Gemini API error:', err);
      }
    }

    // Fallback: Try z-ai-web-dev-sdk
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const history = Array.isArray(conversationHistory) ? conversationHistory.slice(-10) : [];
      const messages = [
        { role: 'system', content: activeSystemPrompt },
        ...history,
        { role: 'user', content: message },
      ];

      const completion = await zai.chat.completions.create({
        messages: messages as any,
        temperature: isQuiz ? 0.6 : 0.7,
        max_tokens: isQuiz ? 4000 : 2000,
      });

      const reply = completion.choices?.[0]?.message?.content;
      if (reply && reply.trim()) {
        return NextResponse.json({
          success: true,
          reply,
          isQuiz,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('z-ai-web-dev-sdk fallback failed:', err);
    }

    return NextResponse.json({
      success: false,
      error: '⚠️ المساعد الذكي غير متاح حالياً. قد يكون ذلك بسبب ضغط على الخادم أو انتهاء صلاحية مفتاح API. يرجى المحاولة بعد قليل. ⏳',
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: '❌ حدث خطأ غير متوقع في نظام المساعد الذكي. يرجى المحاولة مرة أخرى لاحقاً. إذا استمرت المشكلة، تواصل مع الدعم الفني.' },
      { status: 500 }
    );
  }
}
