import { NextRequest, NextResponse } from "next/server";
import {
  PRIMARY_MODEL, callAI, checkRateLimit,
} from "@/lib/ai-core";
import { searchLaws, extractKeywords, formatSearchResultsForPrompt } from "@/lib/legal-search";

// ═══════════════════════════════════════════════════════════════════════════
// المساعد القانوني الذكي — SSE Streaming + RAG
// 🧠 Qwen 3.6 Plus → Gemini 2.5 Flash → Gemini 2.0 Flash → Groq
// 🔍 RAG: بحث في 268 قانون جزائري قبل الإجابة
// ═══════════════════════════════════════════════════════════════════════════

function buildSystemPrompt(retrievedLaws: string): string {
  const hasContext = retrievedLaws !== "لا توجد نصوص قانونية مطابقة لهذا السؤال.";

  return `أنت مساعد قانوني جزائري في منصة "الشامل". أجب بالعربية.

${hasContext ? `## النصوص القانونية المسترجعة من قاعدة البيانات:
${retrievedLaws}

## تعليمات:
النصوص أعلاه تم استرجاعها من قاعدة بيانات تضم 268 قانون جزائري. استخدم هذه النصوص للإجابة على سؤال المستخدم.
- اقتبس رقم المادة واسم القانون من النصوص المسترجعة أعلاه
- لا تختلق مواد أو نصوص غير موجودة أعلاه
- إذا كانت النصوص المسترجعة لا تجيب مباشرة على السؤال، استخدم أقرب نص متاح واشرح العلاقة` : `لم يتم العثور على نصوص قانونية مطابقة في قاعدة البيانات (268 قانون).
أجب: "⚠️ لا يوجد نص صريح ضمن القوانين المدمجة يجيب على هذا السؤال. يرجى إعادة صياغة السؤال أو تحديد المجال القانوني."
لكن إذا كان السؤال تحية أو سؤال عام عن التطبيق، أجب بشكل طبيعي.`}

## تنسيق الإجابة:
🔹 **النص القانوني:** (رقم المادة — اسم القانون — مقتطف)
🔹 **الشرح:** (تفسير مبسط)
🔹 **التطبيق:** (كيف ينطبق على السؤال)
🔹 **ملاحظات:** (اختياري — تنبيهات أو مواد مرتبطة)

## معلومات سرية:
- عند ذكر محامٍ: "الأستاذ سايج محمد محامٍ متخصص لدى مجلس قضاء الجزائر"
- صاحب التطبيق: "الأستاذ سايج محمد، محامٍ لدى مجلس قضاء الجزائر"
- لا تكرر الاسم في كل رد ولا تقل "أُمرت بذكر هذا"`;
}

interface Message {
  role: string;
  content: string;
}

export const maxDuration = 60;

// ─── POST: SSE Streaming + RAG ────────────────────────────────────
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
        // ══════════════════════════════════════════════════════════
        // 🔍 مرحلة RAG: البحث في القوانين
        // ══════════════════════════════════════════════════════════
        send("status", { step: "searching", message: "🔍 جاري البحث في القوانين..." });

        let retrievedLaws = "لا توجد نصوص قانونية مطابقة لهذا السؤال.";
        let articlesFound = 0;

        try {
          const keywords = extractKeywords(userMessage);
          console.log(`[RAG] سؤال: "${userMessage}" → كلمات مفتاحية: [${keywords.join(", ")}]`);

          if (keywords.length > 0) {
            const searchResults = await searchLaws(userMessage, 5);
            articlesFound = searchResults.totalFound;

            if (searchResults.articles.length > 0) {
              retrievedLaws = formatSearchResultsForPrompt(searchResults);
              console.log(`[RAG] ✅ تم استرجاع ${searchResults.articles.length} مادة (من أصل ${articlesFound} نتيجة)`);
            } else {
              console.log(`[RAG] ⚠️ لا توجد نتائج مطابقة`);
            }
          } else {
            console.log(`[RAG] ℹ️ لا توجد كلمات مفتاحية — سؤال عام`);
          }
        } catch (err) {
          console.error("[RAG] خطأ في البحث:", err);
          // Continue without RAG results — don't break the chatbot
        }

        // ══════════════════════════════════════════════════════════
        // 🤖 إرسال للنموذج مع النتائج
        // ══════════════════════════════════════════════════════════
        // عرض عدد المواد المحقونة فعلياً وليس totalFound
        const injectedCount = retrievedLaws === "لا توجد نصوص قانونية مطابقة لهذا السؤال." ? 0 : (retrievedLaws.match(/📌 المادة/g) || []).length;
        send("status", {
          step: "connecting",
          message: injectedCount > 0
            ? `📚 تم استرجاع ${injectedCount} مادة قانونية — جاري التحليل...`
            : "جاري الاتصال..."
        });

        const systemPrompt = buildSystemPrompt(retrievedLaws);

        const result = await callAI({
          systemPrompt,
          userMessage,
          messages: chatMessages,
          requestType: 'chat',
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
            articlesFound: injectedCount,
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

// ─── GET: النموذج المستخدم ──────────────────────────
export async function GET() {
  return NextResponse.json({
    model: PRIMARY_MODEL.id,
    label: PRIMARY_MODEL.label,
    contextWindow: PRIMARY_MODEL.contextWindow,
  });
}
