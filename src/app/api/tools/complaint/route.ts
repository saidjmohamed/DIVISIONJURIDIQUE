import { NextRequest, NextResponse } from "next/server";
import { callAI, checkRateLimit, extractJSON, createSSEStream } from "@/lib/ai-core";

// ═══════════════════════════════════════════════════════════════════════════
// أداة فحص الشكاوى — /api/tools/complaint
// 🧠 OpenRouter → Gemini 2.5 Flash → Gemini 2.0 Flash (4 مفاتيح)
// ═══════════════════════════════════════════════════════════════════════════

export const maxDuration = 30;

const SYSTEM_PROMPT = `أنت محامٍ جزائري خبير في القانون الجزائي وإجراءات تقديم الشكاوى وفق قانون الإجراءات الجزائية (ق.إ.ج).
حلل الشكوى وقيّمها من حيث:
- استيفاء الأركان القانونية
- الوصف الجزائي المناسب
- الجهة المختصة
- ما يجب إضافته أو تصحيحه
أجب بـ JSON فقط.

التنسيق:
{
  "complaintType": "نوع الشكوى",
  "crimes": [{"name":"الجريمة","articles":"المواد","category":"جنحة|جناية|مخالفة"}],
  "competentBody": "الجهة المختصة",
  "result": "valid | needs_completion | rejected",
  "score": 0-100,
  "summary": "ملخص 3-5 جمل",
  "presentElements": [{"label":"ركن مستوفى","article":"المادة"}],
  "missingElements": [{"label":"ركن ناقص","article":"المادة","critical":true,"fix":"ما يجب إضافته"}],
  "recommendations": ["توصية للتحسين"],
  "requiredDocuments": ["وثيقة مطلوبة"],
  "nextSteps": ["خطوة إجرائية"]
}`;

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(req, { key: 'tools-complaint', limit: 8, window: 60 });
  if (rl.limited) return NextResponse.json({ error: rl.errorMessage }, { status: 429 });

  let text: string, complaintType: string;
  try {
    const body = await req.json();
    text          = body.text?.trim() || "";
    complaintType = body.complaintType || "general";
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  if (!text) return NextResponse.json({ error: "نص الشكوى فارغ" }, { status: 400 });
  if (text.length > 12_000) return NextResponse.json({ error: "النص طويل جداً (حد أقصى 12000 حرف)" }, { status: 400 });

  const userMsg = `حلل هذه الشكوى الجزائرية (${complaintType}) وقيّمها قانونياً:\n\n${text.slice(0, 8_000)}\n\nأجب بـ JSON فقط.`;

  return createSSEStream(async (send, close) => {
    send("status", { step: "analyzing", message: "جاري تحليل الشكوى بالذكاء الاصطناعي..." });

    const result = await callAI({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: userMsg,
      requestType: 'legal_analysis',
      temperature: 0.3,
      maxTokens: 2500,
    });

    if (!result.content) {
      send(result.timedOut ? "timeout" : "error", {
        error: result.timedOut ? "استغرق التحليل وقتاً طويلاً." : "فشل الاتصال بالذكاء الاصطناعي.",
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
