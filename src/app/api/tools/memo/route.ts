import { NextRequest, NextResponse } from "next/server";
import { callAI, checkRateLimit, createSSEStream } from "@/lib/ai-core";

// ═══════════════════════════════════════════════════════════════════════════
// أداة صياغة المذكرات القانونية — /api/tools/memo
// 🧠 OpenRouter → Gemini 2.5 Flash → Gemini 2.0 Flash (4 مفاتيح)
// ═══════════════════════════════════════════════════════════════════════════

export const maxDuration = 30;

const MEMO_TYPES: Record<string, string> = {
  opening:          "عريضة افتتاح دعوى",
  response:         "مذكرة جوابية",
  preliminary_plea: "مذكرة دفع شكلي",
  closing:          "مذكرة ختامية",
  appeal:           "مذكرة استئناف",
  appeal_cassation: "مذكرة طعن بالنقض",
  objection:        "مذكرة معارضة",
};

const ARTICLES: Record<string, string> = {
  opening:          "المواد 13، 14، 15 من قانون الإجراءات المدنية والإدارية (ق.إ.م.إ)",
  response:         "المادة 26 ق.إ.م.إ",
  preliminary_plea: "المواد 50، 51، 52 ق.إ.م.إ",
  closing:          "المادة 118 ق.إ.م.إ",
  appeal:           "المادة 336 ق.إ.م.إ — أجل شهر من التبليغ",
  appeal_cassation: "المادة 354 ق.إ.م.إ — أجل شهرين من التبليغ",
  objection:        "المواد 327، 328 ق.إ.م.إ",
};

function buildSystemPrompt(memoType: string): string {
  return `أنت محامٍ جزائري خبير في صياغة المذكرات القانونية وفق قانون الإجراءات المدنية والإدارية (ق.إ.م.إ 08-09).
مهمتك: صياغة ${MEMO_TYPES[memoType] || "مذكرة قانونية"} كاملة ومحكمة باللغة العربية القانونية.

التزم بـ:
- الصياغة القانونية الجزائرية الرسمية
- ذكر المواد القانونية المعتمدة: ${ARTICLES[memoType] || "ق.إ.م.إ"}
- الهيكل: ترويسة → من حيث الشكل → من حيث الموضوع → الطلبات → التوقيع
- لغة واضحة، حجج منطقية، مطابقة للوقائع المقدمة
- لا تخترع وقائع غير مذكورة

أرجع النص الكامل للمذكرة فقط دون أي شرح إضافي.`;
}

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(req, { key: 'tools-memo', limit: 6, window: 60 });
  if (rl.limited) return NextResponse.json({ error: rl.errorMessage }, { status: 429 });

  let memoType: string, court: string, caseNumber: string,
      plaintiff: string, defendant: string, facts: string,
      requests: string, legalBasis: string, lawyerName: string;

  try {
    const body = await req.json();
    memoType    = body.memoType || "response";
    court       = body.court?.trim() || "";
    caseNumber  = body.caseNumber?.trim() || "";
    plaintiff   = body.plaintiff?.trim() || "";
    defendant   = body.defendant?.trim() || "";
    facts       = body.facts?.trim() || "";
    requests    = body.requests?.trim() || "";
    legalBasis  = body.legalBasis?.trim() || "";
    lawyerName  = body.lawyerName?.trim() || "";
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  if (!facts) return NextResponse.json({ error: "يرجى إدخال وقائع القضية" }, { status: 400 });
  if (!court)  return NextResponse.json({ error: "يرجى تحديد الجهة القضائية" }, { status: 400 });

  const today = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });

  const userMsg = `اصغ ${MEMO_TYPES[memoType] || "مذكرة قانونية"} كاملة بناءً على:

الجهة القضائية: ${court}
رقم القضية: ${caseNumber || "غير محدد"}
المدعي/صاحب الطلب: ${plaintiff || "غير محدد"}
المدعى عليه: ${defendant || "غير محدد"}
المحامي: ${lawyerName || "الأستاذ / ..........."}
التاريخ: ${today}

الوقائع:
${facts.slice(0, 5_000)}

الطلبات:
${requests.slice(0, 2_000)}

الأساس القانوني المقترح:
${legalBasis.slice(0, 2_000) || "قانون الإجراءات المدنية والإدارية والقانون المدني"}

اكتب المذكرة الكاملة بالصيغة الرسمية الجزائرية.`;

  return createSSEStream(async (send, close) => {
    send("status", { step: "drafting", message: "جاري صياغة المذكرة بالذكاء الاصطناعي..." });

    const result = await callAI({
      systemPrompt: buildSystemPrompt(memoType),
      userMessage: userMsg,
      requestType: 'legal_analysis',
      temperature: 0.5,
      maxTokens: 4096,
    });

    if (!result.content) {
      send(result.timedOut ? "timeout" : "error", {
        error: result.timedOut ? "استغرق الوقت. يرجى المحاولة مرة أخرى." : "فشل الاتصال بالذكاء الاصطناعي.",
        triedModels: result.triedModels,
      });
      close();
      return;
    }

    send("complete", {
      memo: result.content,
      memoType,
      memoLabel: MEMO_TYPES[memoType] || "مذكرة قانونية",
      model: result.model.id,
      modelLabel: result.model.label,
      tier: result.model.tier,
      triedModels: result.triedModels,
      executionTime: result.elapsedMs,
      aiPowered: true,
    });
    close();
  });
}
