import { NextRequest, NextResponse } from "next/server";
import { callAI, parseAIJson } from "@/lib/ai-provider";

/* ─────────────────────── الأنواع ─────────────────────── */

interface MemoInput {
  memoType: string;       // نوع المذكرة
  court: string;          // اسم المحكمة
  plaintiff: string;      // المدعي / الطاعن
  defendant: string;      // المدعى عليه / المطعون ضده
  facts: string;          // ملخص الوقائع
  requests: string;       // الطلبات
  legalBasis?: string;    // الأسانيد القانونية (اختياري)
  lawyerName?: string;    // اسم المحامي (اختياري)
}

/* ─────────────────────── موجّه النظام ─────────────────────── */

function buildSystemPrompt(input: MemoInput): string {
  const memoTypeLabels: Record<string, string> = {
    response: "مذكرة جوابية",
    closing: "مذكرة ختامية",
    appeal_cassation: "مذكرة طعن بالنقض",
    appeal: "مذكرة استئناف",
    objection: "مذكرة معارضة",
    opening: "مذكرة افتتاحية",
  };
  const memoLabel = memoTypeLabels[input.memoType] ?? "مذكرة قانونية";

  return `أنت محامٍ جزائري خبير متخصص في صياغة المذكرات القانونية أمام المحاكم الجزائرية.

مهمتك: صياغة ${memoLabel} كاملة باللغة العربية الفصحى وفق الأسلوب القانوني الجزائري المعتمد في الإجراءات القضائية.

المعلومات المقدمة:
- نوع المذكرة: ${memoLabel}
- المحكمة: ${input.court}
- المدعي / الطاعن: ${input.plaintiff}
- المدعى عليه / المطعون ضده: ${input.defendant}
- ملخص الوقائع: ${input.facts}
- الطلبات: ${input.requests}
- الأسانيد القانونية: ${input.legalBasis || "يُرجى استنباطها من السياق"}
- المحامي: ${input.lawyerName || "المحامي"}

تعليمات الصياغة:
1. ابدأ بالترويسة الرسمية الكاملة (اسم المحكمة، رقم القضية إن وُجد، التاريخ)
2. استخدم الأسلوب القانوني الجزائري الرسمي (حيث أن، ولما كان، وبالبناء على)
3. قسّم المذكرة إلى أقسام واضحة: الوقائع، الأسانيد القانونية، طلبات الختام
4. استند إلى مواد القانون الجزائري المناسبة
5. اختم بعبارة "وبناءً على ما سبق يلتمس المحامي من المحكمة الموقرة..."
6. يجب أن تكون المذكرة قابلة للاستخدام مباشرة بعد مراجعة المحامي

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
تنسيق الإجابة — JSON فقط:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

أجب فقط بكائن JSON صالح بالضبط بهذا الهيكل (بدون أي نص إضافي أو شرح أو markdown):

{
  "title": "عنوان المذكرة الرسمي",
  "header": "الترويسة الكاملة للمذكرة (اسم المحكمة، الطرفان، التاريخ)",
  "body": "نص المذكرة الكامل والمفصل مقسماً إلى أقسام (وقائع — أسانيد قانونية — حجج الدفاع)",
  "conclusion": "خاتمة المذكرة والطلبات الختامية",
  "legalBasis": ["المادة أو القانون المستند إليه الأول", "المرجع الثاني"]
}

قواعد مهمة:
- أجب فقط بـ JSON صالح. لا تضع أي نص قبل أو بعد الكائن.
- لا تستخدم \`\`\`json أو أي تنسيق markdown.
- كل النصوص يجب أن تكون بالعربية الفصحى.
- النص يجب أن يكون كاملاً ومفصلاً وقابلاً للاستخدام الفعلي.
- استخدم صيغة المذكرات القانونية الجزائرية المعتمدة.
- اذكر على الأقل 3 إلى 5 مواد قانونية مناسبة لنوع المذكرة.
- احرص على الدقة القانونية والصياغة السليمة.`;
}

/* ─────────────────────── معالج الطلب ─────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      memoType,
      court,
      plaintiff,
      defendant,
      facts,
      requests,
      legalBasis,
      lawyerName,
    } = body as MemoInput;

    // Validate required fields
    if (!memoType || !court || !plaintiff || !defendant || !facts || !requests) {
      return NextResponse.json(
        { error: "يرجى تعبئة جميع الحقول الإلزامية (نوع المذكرة، المحكمة، الأطراف، الوقائع، الطلبات)" },
        { status: 400 }
      );
    }

    const input: MemoInput = { memoType, court, plaintiff, defendant, facts, requests, legalBasis, lawyerName };
    const systemPrompt = buildSystemPrompt(input);

    const userMessage = `قم بصياغة المذكرة القانونية المطلوبة بناءً على المعلومات المقدمة وأرجع النتيجة بصيغة JSON فقط.`;

    const result = await callAI({
      systemPrompt,
      userMessage,
      task: "drafting",
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
    if (!p.body || !p.title) {
      return NextResponse.json(
        { error: "نتيجة الصياغة غير مكتملة. يرجى المحاولة مرة أخرى." },
        { status: 500 }
      );
    }

    return NextResponse.json({ memo: parsed, provider: result.provider });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
