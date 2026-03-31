import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "models/gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/* ─────────────────────── النصوص القانونية حسب نوع العريضة ─────────────────────── */

const OPENING_PETITION_ARTICLES = `
## الشروط الشكلية للعريضة الافتتاحية (المستوى الابتدائي) — قانون الإجراءات المدنية والإدارية 08-09:

### المادة 14 — شروط عامة:
ترفع الدعوى بعريضة مكتوبة موقعة ومؤرخة تودع بأمانة الضبط من قبل المدعي أو وكيله أو محاميه بعدد من النسخ يساوي عدد الأطراف.
- تحقق: هل العريضة مكتوبة (وليست شفوية)؟
- تحقق: هل العريضة موقعة؟
- تحقق: هل العريضة مؤرخة؟

### المادة 15 — البيانات الإلزامية تحت طائلة عدم القبول شكلاً:
1. الجهة القضائية التي ترفع أمامها الدعوى (تحديد المحكمة المختصة نوعياً وإقليمياً) — تحقق من ذكر اسم المحكمة أو الجهة القضائية بوضوح
2. اسم ولقب وموطن المدعي — إذا كان شخصاً معنوياً: تسميته وطبيعته ومقره الاجتماعي وصفة ممثله القانوني أو الاتفاقي
3. اسم ولقب وموطن المدعى عليه — فإن لم يكن له موطن معلوم فآخر موطن له. إذا كان شخصاً معنوياً: نفس البيانات
4. عرض موجز للوقائع والطلبات والوسائل التي تؤسس عليها الدعوى
5. الإشارة عند الاقتضاء إلى المستندات والوثائق المؤيدة للدعوى

### المادة 13 — شروط قبول الدعوى:
- الصفة في التقاضي (من النظام العام — يثيرها القاضي تلقائياً)
- المصلحة القائمة أو المحتملة التي يقرها القانون
- الإذن إذا اشترطه القانون

### المادة 10 — التمثيل بمحامٍ:
- توقيع المحامي على العريضة (وجوبي أمام المحكمة في بعض الحالات)
- تحقق من وجود اسم المحامي أو مكتب المحاماة وتوقيعه

### المادة 17 — شهر العريضة:
- إذا تعلق النزاع بعقار أو حق عيني عقاري مشهر: يجب شهر العريضة وتقديم شهادة الشهر في أول جلسة تحت طائلة عدم القبول

### المادة 16 — عدد النسخ:
- يجب إيداع عدد من النسخ يساوي عدد الأطراف

### المادة 65 — الأهلية:
- يثير القاضي تلقائياً انعدام الأهلية
- تحقق من أهلية الأطراف (سن الرشد 19 سنة، عدم الحجر)

### المادة 66 — تصحيح البطلان:
- يمكن تصحيح البطلان إذا زال سببه
`;

const APPEAL_PETITION_ARTICLES = `
## الشروط الشكلية للعريضة الاستئنافية — قانون الإجراءات المدنية والإدارية 08-09:

### المادة 539 — شروط عامة:
يرفع الاستئناف بعريضة تودع بأمانة ضبط المجلس القضائي. تقيد حالاً في سجل خاص.
- تحقق: هل العريضة موجهة للمجلس القضائي (وليس المحكمة)؟

### المادة 540 — البيانات الإلزامية تحت طائلة عدم القبول شكلاً:
1. الجهة القضائية التي أصدرت الحكم المستأنف — تحقق من ذكر المحكمة التي أصدرت الحكم
2. اسم ولقب وموطن المستأنف — بيانات كاملة
3. اسم ولقب وموطن المستأنف عليه — بيانات كاملة
4. عرض الوقائع والأسباب — تحقق من وجود سرد للوقائع وأسباب الاستئناف
5. الطلبات — تحقق من وجود طلبات واضحة ومحددة

### المادة 541 — إرفاق الحكم المستأنف:
يجب إرفاق عريضة الاستئناف بنسخة من الحكم المستأنف تحت طائلة عدم القبول.
- تحقق: هل تمت الإشارة لنسخة الحكم المستأنف؟

### المادة 336 — أجل الاستئناف:
أجل الاستئناف شهر واحد من تاريخ التبليغ الرسمي للحكم إلى الشخص ذاته.
- تحقق: هل تمت الإشارة لتاريخ التبليغ؟ هل يبدو أن الأجل محترم؟

### المادة 538 — التمثيل بمحامٍ:
التمثيل بمحامٍ وجوبي أمام المجلس القضائي. يجب تقديم عريضة مكتوبة موقعة من المحامي.
- تحقق: هل العريضة موقعة من محامٍ؟
- تحقق: هل ذُكر اسم المحامي أو مكتبه؟

### المادة 334 — الأحكام القابلة للاستئناف:
الأحكام الفاصلة في جزء من النزاع لا تقبل الاستئناف إلا مع الحكم القطعي.

### المادة 337 — الاستئناف الفرعي:
يجوز الاستئناف الفرعي حتى في حالة سقوط الحق في الاستئناف الأصلي.
`;

/* ─────────────────────── موجّه النظام لـ Gemini ─────────────────────── */

function buildSystemPrompt(petitionType: "opening" | "appeal"): string {
  const articles = petitionType === "opening" ? OPENING_PETITION_ARTICLES : APPEAL_PETITION_ARTICLES;
  const typeName = petitionType === "opening" ? "عريضة افتتاحية (المستوى الابتدائي)" : "عريضة استئنافية";

  return `أنت خبير قانوني جزائري متخصص في التحقق الشكلي للعرائض وفقاً لقانون الإجراءات المدنية والإدارية 08-09.

مهمتك: تحليل نص العريضة المقدمة وفحصها شكلياً للتحقق من استيفائها لجميع الشروط الشكلية المنصوص عليها قانوناً.

نوع العريضة المطلوب فحصها: ${typeName}

${articles}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
تعليمات التحليل:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. اقرأ نص العريضة بعناية شديدة
2. تحقق من كل شرط من الشروط المذكورة أعلاه
3. لكل شرط، حدد:
   - هل هو موجود ومستوفى (pass)
   - هل هو مفقود (fail)
   - هل يحتاج مراجعة أو غير واضح (warning)
   - هل لا يمكن التحقق منه من النص فقط (not_found)
4. الشروط المُعلَّمة كـ "critical" يجب أن تكون critical: true في النتيجة
5. احسب النتيجة الإجمالية:
   - "accepted": كل الشروط الجوهرية (critical) مستوفاة ولا توجد إخلالات كبيرة
   - "rejected": شرط جوهري واحد أو أكثر مفقود
   - "needs_review": هناك شروط غير واضحة تحتاج مراجعة بشرية
6. احسب النقاط من 0 إلى 100 بناءً على نسبة الشروط المستوفاة (الشروط الجوهرية لها وزن مضاعف)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
تنسيق الإجابة — JSON فقط:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

أجب فقط بكائن JSON صالح بالضبط بهذا الهيكل (بدون أي نص إضافي أو شرح أو markdown):

{
  "result": "accepted" | "rejected" | "needs_review",
  "score": <رقم من 0 إلى 100>,
  "checks": [
    {
      "id": "<معرّف فريد مثل court_designation>",
      "label": "<وصف الشرط بالعربية>",
      "article": "<رقم المادة مثل: م.15 ق.إ.م.إ>",
      "status": "pass" | "fail" | "warning" | "not_found",
      "critical": <true أو false>,
      "details": "<تفاصيل ما وجدته أو لم تجده في النص>"
    }
  ],
  "summary": "<ملخص عام للنتيجة بالعربية — جملتان أو ثلاث>",
  "recommendations": ["<توصية 1>", "<توصية 2>", "..."]
}

قواعد مهمة:
- أجب فقط بـ JSON صالح. لا تضع أي نص قبل أو بعد الكائن.
- لا تستخدم \`\`\`json أو أي تنسيق markdown.
- كل النصوص يجب أن تكون بالعربية.
- كن دقيقاً ومحايداً في التحليل.
- إذا كان النص غير واضح أو مبتور، استخدم "not_found" للشروط التي لا يمكن التحقق منها.
- لا تختلق بيانات غير موجودة في النص.`;
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
    const { text, pdfBase64, petitionType } = body as {
      text?: string;
      pdfBase64?: string;
      petitionType: "opening" | "appeal";
    };

    if (!petitionType || !["opening", "appeal"].includes(petitionType)) {
      return NextResponse.json({ error: "نوع العريضة غير صالح" }, { status: 400 });
    }

    if (!text && !pdfBase64) {
      return NextResponse.json({ error: "لم يتم تقديم نص العريضة أو ملف PDF" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(petitionType);

    // Build the user content parts
    const userParts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [];

    if (pdfBase64) {
      // PDF: send as inline_data for Gemini's document understanding
      userParts.push({
        inline_data: {
          mime_type: "application/pdf",
          data: pdfBase64,
        },
      });
      userParts.push({
        text: "هذه هي العريضة المطلوب فحصها شكلياً. قم بتحليلها وفق التعليمات المذكورة وأرجع النتيجة بصيغة JSON فقط.",
      });
    } else if (text) {
      userParts.push({
        text: `هذا هو نص العريضة المطلوب فحصها شكلياً:\n\n---\n${text}\n---\n\nقم بتحليل هذا النص وفق التعليمات المذكورة وأرجع النتيجة بصيغة JSON فقط.`,
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
        maxOutputTokens: 4096,
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
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json(
        { error: "لم ترجع خدمة التحليل أي نتيجة. يرجى المحاولة مرة أخرى." },
        { status: 500 }
      );
    }

    // Parse the JSON from Gemini's response — handle possible markdown wrapping
    let cleaned = rawText.trim();
    // Remove ```json ... ``` wrapper if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini JSON response:", cleaned.slice(0, 500));
      return NextResponse.json(
        {
          error: "تعذّر قراءة نتيجة التحليل. يرجى المحاولة مرة أخرى.",
          raw: cleaned.slice(0, 1000),
        },
        { status: 500 }
      );
    }

    // Validate basic structure
    if (!parsed.result || !Array.isArray(parsed.checks)) {
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
