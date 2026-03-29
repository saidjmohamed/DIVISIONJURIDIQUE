import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const QUICK_RESPONSES: Record<string, string> = {
  'كيف أستخدم المساعد الذكي؟':
    '🧠 **المساعد الذكي**\n\nلاستخدام المساعد الذكي:\n1. اذهب إلى تبويب "مساعد ذكي" 🧠\n2. اكتب سؤالك القانوني في حقل الإدخال\n3. أو اختر من الأسئلة المقترحة\n4. اضغط على زر الإرسال وانتظر الرد\n\n💡 يمكنك سؤالي عن أي موضوع يخص القانون الجزائري!',

  'كيف أرفع ملف PDF؟':
    '📄 **رفع الملفات**\n\nلرفع ملف PDF:\n1. اذهب إلى تبويب "المكتبة" 📚\n2. اضغط على منطقة الرفع\n3. اختر الملف من جهازك أو اسحبه وأفلته\n4. انتظر حتى يتم الرفع\n\n💡 يدعم التطبيق ملفات PDF وWord وTXT',

  'كيف أستخدم أدوات PDF؟':
    '🔧 **أدوات PDF**\n\nالتطبيق يوفر 6 أدوات:\n1. **دمج** - دمج عدة ملفات PDF في واحد\n2. **تقسيم** - تقسيم ملف PDF لعدة أجزاء\n3. **ضغط** - تقليل حجم ملف PDF\n4. **تحويل** - تحويل مستندات إلى PDF\n5. **علامة مائية** - إضافة علامة مائية\n6. **حماية** - تأمين بكلمة مرور\n\n💡 اذهب إلى تبويب "أدوات PDF" لاستخدامها',

  'كيف أجتاز الاختبار؟':
    '❓ **الاختبار القانوني**\n\nلاختبار معلوماتك:\n1. اذهب إلى تبويب "اختبار" ❓\n2. اختر الموضوع القانوني\n3. اختر مستوى الصعوبة\n4. اختر عدد الأسئلة\n5. اضغط "ابدأ الاختبار"\n6. أجب على الأسئلة\n7. شاهد نتيجتك!\n\n💡 الأسئلة تُولد تلقائياً بالذكاء الاصطناعي',

  'ما هي ميزات التطبيق؟':
    '✨ **ميزات تطبيق الشامل**\n\n🏛️ **قانون جزائري شامل** - تغطية جميع فروع القانون\n🧠 **مساعد ذكي** - إجابات فورية لأسئلتك القانونية\n📚 **مكتبة رقمية** - رفع وتنظيم ملفاتك القانونية\n🔧 **أدوات PDF** - 6 أدوات لمعالجة ملفات PDF\n❓ **اختبارات** - اختبر معلوماتك القانونية\n🔍 **بحث متقدم** - ابحث في القوانين والنصوص\n🤖 **بوت المساعدة** - دليلك لاستخدام التطبيق',
};

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { response: 'يرجى كتابة سؤال' },
        { status: 400 }
      );
    }

    // Check for quick responses first
    if (QUICK_RESPONSES[message]) {
      return NextResponse.json({ response: QUICK_RESPONSES[message] });
    }

    // Fallback to Gemini
    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        response:
          'عذراً، لم أتمكن من الإجابة حالياً. يرجى المحاولة مرة أخرى لاحقاً. 🙏',
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `أنت مساعد تطبيق "الشامل" لمنصة القانون الجزائري. أجب عن سؤال المستخدم بشكل موجز ومفيد باللغة العربية:\n\n${message}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        response: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى. 🙏',
      });
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'عذراً، لم أتمكن من معالجة طلبك.';

    return NextResponse.json({ response: text });
  } catch {
    return NextResponse.json({
      response: 'عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى. 🙏',
    });
  }
}
