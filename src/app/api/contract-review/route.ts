import { NextRequest, NextResponse } from "next/server";
import { callAI, parseAIJson } from "@/lib/ai-provider";

/* ─────────────────────── موجّه النظام ─────────────────────── */

function buildSystemPrompt(contractType: string): string {
  const contractTypeLabel: Record<string, string> = {
    sale: "عقد بيع",
    rent: "عقد إيجار",
    work: "عقد عمل",
    company: "عقد شركة",
    property: "عقد عقاري",
    general: "عقد (نوع غير محدد)",
  };
  const label = contractTypeLabel[contractType] ?? "عقد";

  return `أنت خبير قانوني جزائري متخصص في مراجعة العقود وفقاً للقانون المدني الجزائري (الأمر 75-58 المعدل والمتمم).

مهمتك: فحص ${label} المقدم وتحليله تحليلاً قانونياً دقيقاً للكشف عن أي إشكاليات أو مخاطر قانونية.

المواد القانونية الواجب التحقق منها:

### أركان العقد (م.54 ق.م):
- التراضي: هل تم التعبير عن إرادة الطرفين بوضوح؟
- المحل: هل موضوع العقد موجود ومعين ومشروع؟ (م.92-96)
- السبب: هل سبب العقد موجود ومشروع؟ (م.97-98)

### الأهلية (م.71 ق.م):
- يشترط بلوغ 19 سنة لإبرام العقود
- التحقق من صفة الممثل القانوني للأشخاص المعنوية

### عيوب الإرادة (م.59-61 ق.م):
- الغلط: هل توجد أخطاء جوهرية؟ (م.59)
- التدليس: هل يوجد تضليل أو غش؟ (م.60)
- الإكراه: هل يوجد إجبار أو تهديد؟ (م.61)
- الاستغلال: هل هناك استغلال لحاجة أو ضعف أحد الطرفين؟ (م.90)

### مبدأ سلطان الإرادة (م.106 ق.م):
- العقد شريعة المتعاقدين — هل البنود واضحة وملزمة؟

### حسن النية (م.107 ق.م):
- هل يُلزم العقد بتنفيذ متطلبات حسن النية؟

### الشروط التعسفية والإذعان (م.110-119 ق.م):
- هل توجد شروط مجحفة أو تعسفية ضد أحد الطرفين؟
- هل العقد عقد إذعان يحتاج مراجعة خاصة؟

### الشكلية في العقود العقارية (م.324 مكرر 1 ق.م):
- ${contractType === "property" ? "يشترط التوثيق الرسمي تحت طائلة البطلان — هل تمت الإشارة للتوثيق؟" : "ليست عقداً عقارياً — لا يشترط التوثيق الرسمي بالضرورة"}

### بنود الضمان والمسؤولية:
- هل يوجد نص على الضمان؟
- هل تحديد المسؤولية عادل؟
- هل يوجد نص على حل النزاعات؟

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
تنسيق الإجابة — JSON فقط:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

أجب فقط بكائن JSON صالح بالضبط بهذا الهيكل (بدون أي نص إضافي أو شرح أو markdown):

{
  "contractType": "نوع العقد",
  "parties": [
    {"name": "اسم الطرف الأول", "role": "دوره في العقد (بائع/مشتري/مؤجر/مستأجر...)"}
  ],
  "result": "valid",
  "score": 85,
  "checks": [
    {
      "id": "consent",
      "label": "التراضي — م.54 ق.م",
      "article": "م.54 ق.م",
      "status": "pass",
      "critical": true,
      "details": "تفاصيل ما وجدته في العقد بشأن هذا الشرط"
    }
  ],
  "missingClauses": ["بند مفقود يُنصح بإضافته"],
  "risks": ["خطر قانوني محتمل"],
  "summary": "ملخص عام لنتيجة مراجعة العقد",
  "recommendations": ["توصية عملية للمحامي"]
}

قواعد مهمة:
- result يكون: "valid" (عقد سليم)، "has_issues" (يوجد إشكاليات بسيطة)، "major_issues" (إشكاليات جوهرية)
- score من 0 إلى 100 بناءً على نسبة استيفاء الشروط القانونية
- أجب فقط بـ JSON صالح. لا تضع أي نص قبل أو بعد الكائن.
- لا تستخدم \`\`\`json أو أي تنسيق markdown.
- كل النصوص يجب أن تكون بالعربية.
- كن دقيقاً ومحايداً ولا تختلق بيانات غير موجودة في نص العقد.`;
}

/* ─────────────────────── معالج الطلب ─────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, pdfBase64, contractType = "general" } = body as {
      text?: string;
      pdfBase64?: string;
      contractType?: string;
    };

    if (!text && !pdfBase64) {
      return NextResponse.json(
        { error: "لم يتم تقديم نص العقد أو ملف PDF" },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(contractType);

    const userMessage = pdfBase64
      ? `هذا هو العقد المطلوب مراجعته. قم بمراجعته وفق التعليمات المذكورة وأرجع النتيجة بصيغة JSON فقط.`
      : `هذا هو نص العقد المطلوب مراجعته:\n\n---\n${text}\n---\n\nقم بمراجعة هذا العقد وفق التعليمات المذكورة وأرجع النتيجة بصيغة JSON فقط.`;

    const result = await callAI({
      systemPrompt,
      userMessage,
      pdfBase64: pdfBase64 || undefined,
      task: "analysis",
    });

    let parsed;
    try {
      parsed = parseAIJson(result.text);
    } catch {
      console.error("JSON parse failed:", result.text.slice(0, 500));
      return NextResponse.json(
        { error: "تعذّر قراءة نتيجة التحليل. يرجى المحاولة مرة أخرى." },
        { status: 500 }
      );
    }

    const p = parsed as Record<string, unknown>;
    if (!p.result || !Array.isArray(p.checks)) {
      return NextResponse.json(
        { error: "نتيجة المراجعة غير مكتملة. يرجى المحاولة مرة أخرى." },
        { status: 500 }
      );
    }

    return NextResponse.json({ analysis: parsed, provider: result.provider });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
