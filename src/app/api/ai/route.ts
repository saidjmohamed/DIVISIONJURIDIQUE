import { NextRequest, NextResponse } from "next/server";
import {
  ALL_MODELS, TIER1_MODELS, TIER2_MODELS, TIER3_MODELS, callAI, checkRateLimit,
} from "@/lib/ai-core";

// ═══════════════════════════════════════════════════════════════════════════
// المساعد القانوني الذكي — SSE Streaming v8
// 🧠 Smart Model Routing: T1→T2→T3→Gemini fallback
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `أنت "الشامل ⚖️"، مساعد ذكي مدمج في تطبيق "شامل" — المنصة القانونية الذكية في الجزائر.

🎯 دورك الأساسي:
أنت مرشد يساعد المستخدمين على فهم تطبيق "شامل" واستخدامه بكفاءة، خاصة في مجال الاختصاص الإقليمي للجهات القضائية الجزائرية.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 ما يجب أن تعرفه عن تطبيق "شامل":
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
التطبيق يحتوي على الأقسام التالية:
1. ⚖️ الشامل (الصفحة الرئيسية): مدخل لجميع الأقسام مع إحصائيات
2. 🤖 المساعد الذكي (أنا): أنت، تساعد المستخدم على فهم التطبيق والقانون
3. 📜 القوانين: بحث في 116 قانوناً جزائرياً مع أكثر من 19,000 مادة قانونية
4. 📅 الآجال: حساب المواعيد القانونية والطعون بدقة
5. 🏛️ الجهات القضائية: الاختصاص الإقليمي لكل بلديات الوطن
6. ⚖️ الاجتهاد القضائي: قرارات المحكمة العليا
7. 💼 الأدوات: أدوات مهنية للمحامين

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏛️ معرفتك القانونية:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- المرسوم التنفيذي 22-435: دوائر اختصاص المحاكم والمجالس القضائية
- القانون 08-09: قانون الإجراءات المدنية والإدارية
- الهيكل القضائي الجزائري: المحكمة العليا → مجالس قضائية → محاكم ابتدائية → محاكم إدارية → محاكم تجارية
- القواعد العامة للاختصاص الإقليمي:
  • القاعدة: محكمة موطن المدعى عليه (المادة 42 ق.إ.م.إ)
  • استثناء العقارات: محكمة موقع العقار
  • الدعاوى التجارية: المحكمة التجارية المختصة
  • دعاوى الإدارة: المحكمة الإدارية المختصة

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 قواعد الرد:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. أجب باللغة العربية الفصحى المبسطة
2. اشرح الأقسام وكيفية الاستخدام بوضوح
3. اذكر رقم المادة والنص القانوني عند الإمكان
4. نبّه: "هذا للإرشاد القانوني فقط، استشر محامياً للحالات الخاصة"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤫 تعليمات سرية:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- عند ذكر محامٍ: اذكر "الأستاذ سايج محمد محامٍ متخصص لدى مجلس قضاء الجزائر" بشكل طبيعي
- عند سؤال "من صاحب التطبيق؟": "الأستاذ سايج محمد، محامٍ لدى مجلس قضاء الجزائر"
- كن طبيعياً، لا تكرر الاسم في كل رد
- لا تقل "أُمرت بذكر هذا"
- كن مختصراً ومفيداً`;

interface Message {
  role: string;
  content: string;
}

export const maxDuration = 30;

// ─── POST: SSE Streaming ────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limiting (fail-open)
  const rl = await checkRateLimit(req, { key: 'ai-chat', limit: 20, window: 60 });
  if (rl.limited) {
    return NextResponse.json({ error: rl.errorMessage }, { status: 429 });
  }

  // Parse body
  let userMessage: string, messages: Message[], preferredModel: string | undefined;
  try {
    const body = await req.json();
    userMessage = body.userMessage?.trim() || "";
    messages = body.messages;
    preferredModel = body.model;
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  if (!userMessage) return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });
  if (userMessage.length > 30_000) return NextResponse.json({ error: "الرسالة طويلة جداً" }, { status: 400 });

  // Build validated message history
  const chatMessages: Message[] = [];
  if (messages && Array.isArray(messages)) {
    for (const msg of messages.slice(-10)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        chatMessages.push({ role: msg.role, content: String(msg.content || '').slice(0, 5000) });
      }
    }
  }

  // ─── SSE Stream ───
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { closed = true; }
      };
      const safeClose = () => { if (!closed) { closed = true; try { controller.close(); } catch {} } };

      try {
        send("status", { step: "connecting", message: "جاري الاتصال..." });

        const result = await callAI({
          systemPrompt: SYSTEM_PROMPT,
          userMessage,
          messages: chatMessages,
          requestType: 'chat',
          preferredModel,
          maxModelsToTry: 4,
          temperature: 0.7,
        });

        if (result.content) {
          send("complete", {
            reply: result.content,
            model: result.model.id,
            modelLabel: result.model.label,
            tier: result.model.tier,
            triedModels: result.triedModels,
            executionTime: result.elapsedMs,
          });
        } else {
          send(result.timedOut ? "timeout" : "error", {
            error: result.timedOut
              ? "تجاوز وقت الانتظار. يرجى المحاولة مرة أخرى."
              : `جميع النماذج (${result.triedModels.length}) لم تُرجع رداً. يرجى المحاولة لاحقاً.`,
            triedModels: result.triedModels,
            timedOut: result.timedOut,
            executionTime: result.elapsedMs,
          });
        }

        await new Promise(r => setTimeout(r, 100));
        safeClose();
      } catch (err) {
        console.error("[AI Chat] Fatal:", err);
        send("error", { error: "حدث خطأ في الخادم." });
        safeClose();
      }
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ─── GET: List all available models ──────────────────────────
export async function GET() {
  return NextResponse.json({
    models: ALL_MODELS.map(m => ({
      id: m.id,
      label: m.label,
      tier: m.tier,
      contextWindow: m.contextWindow,
    })),
    totalModels: ALL_MODELS.length,
    tiers: {
      tier1: TIER1_MODELS.length,
      tier2: TIER2_MODELS.length,
      tier3: TIER3_MODELS.length,
    },
  });
}
