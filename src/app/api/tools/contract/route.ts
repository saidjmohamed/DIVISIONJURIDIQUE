import { NextRequest, NextResponse } from "next/server";
import { callAI, checkRateLimit, extractJSON, createSSEStream } from "@/lib/ai-core";

// ═══════════════════════════════════════════════════════════════════════════
// أداة مراجعة العقود — /api/tools/contract
// 🧠 Qwen 3.6 Plus → Gemini 2.5 Flash → Gemini 2.0 Flash → Groq
// ═══════════════════════════════════════════════════════════════════════════

export const maxDuration = 30;

const SYSTEM_PROMPT = `أنت محامٍ جزائري خبير في مراجعة العقود وفق القانون المدني الجزائري (الأمر 75-58 المعدل).
مهمتك: تحليل العقد شكلياً وموضوعياً، تحديد النواقص والمخاطر، واقتراح تحسينات.
أجب بـ JSON فقط دون أي نص إضافي قبله أو بعده.

التنسيق المطلوب بالضبط:
{
  "contractType": "نوع العقد بالعربية",
  "result": "valid | has_issues | major_issues",
  "score": 0-100,
  "summary": "ملخص 3-5 جمل",
  "checks": [
    {"id":"id","label":"الشرط","article":"المادة","status":"pass|fail|warning","critical":true,"details":"التفاصيل"}
  ],
  "missingClauses": ["بند ناقص ..."],
  "risks": ["خطر قانوني ..."],
  "recommendations": ["توصية للتحسين ..."]
}`;

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(req, { key: 'tools-contract', limit: 8, window: 60 });
  if (rl.limited) return NextResponse.json({ error: rl.errorMessage }, { status: 429 });

  let text: string, contractType: string;
  try {
    const body = await req.json();
    text = body.text?.trim() || "";
    contractType = body.contractType || "general";
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  if (!text) return NextResponse.json({ error: "نص العقد فارغ" }, { status: 400 });
  if (text.length > 15_000) return NextResponse.json({ error: "النص طويل جداً (حد أقصى 15000 حرف)" }, { status: 400 });

  const CONTRACT_LABELS: Record<string, string> = {
    sale: "عقد بيع", rent: "عقد إيجار", work: "عقد عمل",
    company: "عقد شركة", property: "عقد عقاري", general: "عقد عام",
  };

  const userMsg = `راجع هذا ${CONTRACT_LABELS[contractType] || "العقد"} وفق القانون المدني الجزائري وأعطني تحليلاً شاملاً:\n\n${text.slice(0, 10_000)}\n\nأجب بـ JSON فقط.`;

  return createSSEStream(async (send, close) => {
    send("status", { step: "analyzing", message: "جاري تحليل العقد بالذكاء الاصطناعي..." });

    const result = await callAI({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: userMsg,
      requestType: 'legal_analysis',
      temperature: 0.3,
      maxTokens: 3000,
    });

    if (!result.content) {
      send(result.timedOut ? "timeout" : "error", {
        error: result.timedOut ? "استغرق التحليل وقتاً طويلاً. يرجى المحاولة مرة أخرى." : "فشل الاتصال بجميع نماذج الذكاء الاصطناعي. يرجى المحاولة لاحقاً.",
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
