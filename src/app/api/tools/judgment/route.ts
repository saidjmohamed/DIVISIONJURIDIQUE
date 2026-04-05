import { NextRequest, NextResponse } from "next/server";
import { callAI, checkRateLimit, extractJSON, createSSEStream } from "@/lib/ai-core";

// ═══════════════════════════════════════════════════════════════════════════
// أداة تحليل الأحكام القضائية — /api/tools/judgment
// 🧠 Qwen 3.6 Plus → Gemini 2.5 Flash → Gemini 2.0 Flash → Groq
// ═══════════════════════════════════════════════════════════════════════════

export const maxDuration = 30;

const SYSTEM_PROMPT = `أنت محامٍ جزائري خبير في تحليل الأحكام القضائية.
استخرج المعلومات الجوهرية من الحكم وحللها. أجب بـ JSON فقط.

التنسيق المطلوب:
{
  "court": "الجهة القضائية",
  "caseNumber": "رقم القضية",
  "date": "تاريخ الحكم",
  "plaintiff": "المدعي/المستأنف",
  "defendant": "المدعى عليه",
  "ruling": "منطوق الحكم",
  "legalBasis": ["المادة أو النص القانوني المستند إليه"],
  "summary": "ملخص الحكم في 3-5 جمل",
  "keyPoints": ["نقطة جوهرية في الحكم"],
  "appealOptions": [
    {
      "type": "نوع الطعن",
      "deadline": "الأجل",
      "article": "المادة",
      "conditions": "الشروط والملاحظات"
    }
  ],
  "weaknesses": ["نقطة ضعف قابلة للطعن"],
  "recommendation": "توصية المحامي بخصوص الطعن"
}`;

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(req, { key: 'tools-judgment', limit: 8, window: 60 });
  if (rl.limited) return NextResponse.json({ error: rl.errorMessage }, { status: 429 });

  let text: string;
  try {
    const body = await req.json();
    text = body.text?.trim() || "";
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  if (!text) return NextResponse.json({ error: "نص الحكم فارغ" }, { status: 400 });
  if (text.length > 15_000) return NextResponse.json({ error: "النص طويل جداً (حد أقصى 15000 حرف)" }, { status: 400 });

  const userMsg = `حلل هذا الحكم القضائي الجزائري واستخرج كل المعلومات الجوهرية:\n\n${text.slice(0, 10_000)}\n\nأجب بـ JSON فقط.`;

  return createSSEStream(async (send, close) => {
    send("status", { step: "analyzing", message: "جاري تحليل الحكم بالذكاء الاصطناعي..." });

    const result = await callAI({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: userMsg,
      requestType: 'legal_analysis',
      temperature: 0.3,
      maxTokens: 3000,
    });

    if (!result.content) {
      send(result.timedOut ? "timeout" : "error", {
        error: result.timedOut ? "استغرق التحليل وقتاً طويلاً. يرجى المحاولة مرة أخرى." : "فشل الاتصال بجميع نماذج الذكاء الاصطناعي.",
        triedModels: result.triedModels,
      });
      close();
      return;
    }

    const jsonStr = extractJSON(result.content);
    if (!jsonStr) {
      send("complete", { raw: result.content, parseFailed: true, model: result.model.id, modelLabel: result.model.label, triedModels: result.triedModels, executionTime: result.elapsedMs });
      close();
      return;
    }

    try {
      const parsed = JSON.parse(jsonStr);
      send("complete", { ...parsed, model: result.model.id, modelLabel: result.model.label, tier: result.model.tier, triedModels: result.triedModels, parseFailed: false, executionTime: result.elapsedMs, aiPowered: true });
    } catch {
      send("complete", { raw: result.content, parseFailed: true, model: result.model.id, modelLabel: result.model.label, triedModels: result.triedModels, executionTime: result.elapsedMs });
    }
    close();
  });
}
