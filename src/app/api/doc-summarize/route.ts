import { NextRequest, NextResponse } from "next/server";
import { callAI, parseAIJson } from "@/lib/ai-provider";

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

    const userMessage = pdfBase64
      ? `هذا هو المستند القانوني المطلوب تلخيصه. قم بتلخيصه وفق التعليمات المذكورة وأرجع النتيجة بصيغة JSON فقط.`
      : `هذا هو نص المستند القانوني المطلوب تلخيصه:\n\n---\n${text}\n---\n\nقم بتلخيص هذا المستند وفق التعليمات المذكورة وأرجع النتيجة بصيغة JSON فقط.`;

    const result = await callAI({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      pdfBase64: pdfBase64 || undefined,
      task: "general",
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
    if (!p.summary || !p.type) {
      return NextResponse.json(
        { error: "نتيجة التلخيص غير مكتملة. يرجى المحاولة مرة أخرى." },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary: parsed, provider: result.provider });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
