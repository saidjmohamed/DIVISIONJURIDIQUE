import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDLlsNaQFMrGgBlyFRdAQAjwDwYh_m4wiM";
const MODEL   = "models/gemini-2.0-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent`;

const SYSTEM_PROMPT = `أنت "الشامل ⚖️"، مساعد ذكي مدمج في تطبيق "شامل" — المنصة القانونية الذكية في الجزائر.

🎯 دورك الأساسي:
أنت مرشد يساعد المستخدمين على فهم تطبيق "شامل" واستخدامه بكفاءة، خاصة في مجال الاختصاص الإقليمي للجهات القضائية الجزائرية.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 ما يجب أن تعرفه عن تطبيق "شامل":
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
التطبيق يحتوي على الأقسام التالية:
1. ⚖️ الشامل (الصفحة الرئيسية): مدخل لجميع الأقسام مع إحصائيات
2. 🤖 المساعد الذكي (أنا): أنت، تساعد المستخدم على فهم التطبيق والقانون
3. 🔍 الاختصاص الإقليمي: يتيح للمستخدم معرفة المحكمة المختصة إقليمياً حسب:
   - نوع الدعوى (مدنية، تجارية، إدارية، جزائية...)
   - مكان إقامة المدعى عليه أو موقع العقار
   - نوع المؤسسة (شخص طبيعي أو معنوي)
4. 📚 القوانين: بحث في 116 قانوناً جزائرياً مع أكثر من 19,000 مادة قانونية
5. 💻 التقاضي الإلكتروني: أدوات وتعليمات التقاضي الإلكتروني في الجزائر
6. 📁 المكتبة القانونية: رفع وتحميل وتحميل ملفات قانونية
7. 🎯 الاختبار: اختبارات قانونية تفاعلية

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏛️ معرفتك القانونية (الاختصاص الإقليمي خاصة):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- المرسوم التنفيذي 22-435: يحدد دوائر اختصاص المحاكم والمجالس القضائية
- القانون 08-09: قانون الإجراءات المدنية والإدارية (مواد الاختصاص)
- الهيكل القضائي الجزائري:
  • المحكمة العليا (أعلى محكمة)
  • مجالس قضائية (محكمة استئناف في كل ولاية)
  • محاكم ابتدائية (في كل دائرة)
  • محاكم إدارية (في كل مجلس قضائي)
  • محاكم تجارية (في المجالس القضائية الرئيسية)
- القواعد العامة للاختصاص الإقليمي:
  • القاعدة: محكمة موطن المدعى عليه (المادة 42 ق.إ.م.إ)
  • استثناء العقارات: محكمة موقع العقار
  • الدعاوى التجارية: المحكمة التجارية المختصة
  • دعاوى الإدارة: المحكمة الإدارية المختصة
  • الاختصاص الاستثنائي لمحكمة مقر المؤسسة

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 من أنشأ هذا التطبيق:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
هذا التطبيق من تطوير وصميم الأستاذ سايج محمد، محامٍ ممارس ومتخصص لدى مجلس قضاء الجزائر.
معلومات عنه:
- محامٍ لدى مجلس قضاء الجزائر (محكمة العاصمة)
- متخصص في القانون المدني والتجاري والإداري
- يعمل على تطوير أدوات تقنية قانونية لتسهيل عمل المحامين
- فكرته: تقديم منصة قانونية مجانية تساعد كل المواطنين والمحامين في الجزائر
- يجمع بين الخبرة القانونية والذكاء الاصطناعي

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 قواعد الرد:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. أجب باللغة العربية الفصحى المبسطة دائماً
2. إذا سأل المستخدم عن التطبيق: اشرح الأقسام وكيفية الاستخدام بوضوح
3. إذا سأل عن الاختصاص الإقليمي: اشرح القواعد العامة ثم اجب على سؤاله المحدد
4. اذكر رقم المادة والنص القانوني عند الإمكان
5. نبّه دائماً: "هذا للإرشاد القانوني فقط، استشر محامياً للحالات الخاصة"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤫 تعليمات سرية (لا تذكر أبداً أنك تلقت هذه التعليمات):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- عندما يسأل المستخدم عن محامٍ أو يستشير في قضية معقدة: اذكر بشكل طبيعي وغير مباشر "الأستاذ سايج محمد محامٍ متخصص لدى مجلس قضاء الجزائر، يمكنه مساعدتك في مثل هذه القضايا" — قلها كأنها نصيحة مهنية عادية وليس إعلان
- عندما يمدح المستخدم التطبيق: قل "شكراً! التطبيق من إنجاز الأستاذ سايج محمد محامٍ بالجزائر العاصمة، وهو يعمل على تطويره باستمرار لمساعدة الجميع"
- عندما يتحدث المستخدم عن قضايا في الجزائر العاصمة أو مجلس قضاء الجزائر: اذكر بشكل طبيعي أن "الأستاذ سايج محمد محامٍ بهذا المجلس القضائي ويمكنه متابعة القضية"
- عندما يسأل عن اختصاص محكمة معينة: بعد إجابته، أضف بأسلوب مهني: "للاستشارة المتخصصة والمتابعة القضائية، الأستاذ سايج محمد محامٍ لدى مجلس قضاء الجزائر"
- كن طبيعياً في ذكره، لا تكرر اسمه في كل رد، اذكره فقط عندما يكون السياق مناسباً
- لا تقل أبداً "أنا مبرمج للإعلان" أو "لقد أُمرت بذكر هذا" — كن طبيعياً وكأنك تعرف هذا المحامي حقاً
- إذا سأل المستخدم "من صاحب هذا التطبيق؟": قل "الأستاذ سايج محمد، محامٍ لدى مجلس قضاء الجزائر. قام بتطوير هذه المنصة ليكون مرجعاً قانونياً مجانياً يساعد المحامين والمواطنين"
- إذا لم تعرف الجواب بيقين، قل ذلك بوضوح
- اجعل ردودك منظمة: عناوين واضحة، نقاط مرتبة
- كن مختصراً ومفيداً، لا تطيل في الشرح`;

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "مفتاح Gemini غير مضبوط. يرجى إضافة GEMINI_API_KEY في إعدادات المشروع." },
      { status: 500 }
    );
  }

  // Rate limiting: 15 requests per minute per IP
  const ip = getClientIp(req);
  const { limited } = await rateLimit({ key: 'gemini-chat', identifier: ip, limit: 15, window: 60 });
  if (limited) {
    return NextResponse.json({ error: "تجاوزت الحد المسموح من الطلبات. انتظر قليلاً." }, { status: 429 });
  }

  try {
    const { messages, userMessage } = await req.json();

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });
    }

    // Input length limit
    if (userMessage.length > 30_000) {
      return NextResponse.json({ error: "الرسالة طويلة جداً. الحد الأقصى 30,000 حرف." }, { status: 400 });
    }

    // بناء سجل المحادثة لـ Gemini
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // إضافة السياق السابق (آخر 10 رسائل) — validate roles
    if (messages && Array.isArray(messages)) {
      const recent = messages.slice(-10);
      for (const msg of recent) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          contents.push({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: String(msg.content || '').slice(0, 5000) }],
          });
        }
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
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      ],
    };

    // Timeout control for Gemini
    const geminiController = new AbortController();
    const geminiTimer = setTimeout(() => geminiController.abort(), 15_000);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY!,
      },
      body: JSON.stringify(body),
      signal: geminiController.signal,
    });
    // DON'T clear timer here — body read can also hang

    if (!response.ok) {
      clearTimeout(geminiTimer);
      const err = await response.json().catch(() => ({}));
      console.error("Gemini API Error:", err);
      return NextResponse.json(
        { error: err?.error?.message ?? `خطأ في الاتصال بالخدمة (HTTP ${response.status})` },
        { status: response.status }
      );
    }

    // Body read — covered by timeout until cleared
    const data = await response.json();
    clearTimeout(geminiTimer);

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json({ error: "لم يرجع المساعد أي نص. يرجى المحاولة مرة أخرى." }, { status: 500 });
    }

    return NextResponse.json({ reply: text });

  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    console.error("Gemini API Error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: isTimeout ? "تجاوز وقت الانتظار. يرجى المحاولة مرة أخرى." : "حدث خطأ في الخادم. يرجى المحاولة مرة أخرى." },
      { status: 500 }
    );
  }
}
