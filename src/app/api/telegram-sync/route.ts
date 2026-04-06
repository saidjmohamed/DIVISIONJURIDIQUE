/**
 * /api/telegram-sync
 *
 * يقرأ آخر رسائل من قناة Telegram "الشامل" ويحوّلها إلى مستجدات قانونية
 * مخزّنة في Redis لتظهر في تبويب التحديثات داخل التطبيق.
 *
 * الاستدعاء:
 *   GET /api/telegram-sync?secret=CRON_SECRET
 *   (يُضاف في vercel.json كـ cron بجانب fetch-updates)
 */

import { NextRequest, NextResponse } from "next/server";
import { mergeEntries, type LegalEntry } from "@/lib/legal-cache";

export const dynamic     = "force-dynamic";
export const maxDuration = 30;

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN   || "";
const CHANNEL_ID  = process.env.TELEGRAM_CHANNEL_ID  || ""; // مثال: @alshamil_dz أو -1001234567890
const LIMIT       = 20;  // آخر 20 رسالة

// ── تصنيف نوع النص القانوني ─────────────────────────────────────────────
function classifyType(text: string): string {
  if (/قانون\s+أساسي|قانون\s+عضوي/.test(text)) return "قانون";
  if (/قانون/.test(text))                         return "قانون";
  if (/مرسوم\s+تنفيذي/.test(text))               return "مرسوم تنفيذي";
  if (/مرسوم\s+رئاسي/.test(text))                return "مرسوم رئاسي";
  if (/مرسوم/.test(text))                         return "مرسوم تنفيذي";
  if (/قرار/.test(text))                          return "قرار";
  if (/اجتهاد|قضاء/.test(text))                  return "اجتهاد";
  if (/منشور/.test(text))                         return "منشور";
  return "خبر رسمي";
}

// ── تصنيف المجال القانوني ─────────────────────────────────────────────
function classifyCategory(text: string): string {
  if (/مدني|عقد|التزام|مسؤولية/.test(text))       return "مدني";
  if (/جزائي|جنائي|عقوب|جريمة/.test(text))        return "جزائي";
  if (/إداري|دوائر|تأديب|وظيف/.test(text))        return "إداري";
  if (/تجاري|شركة|تجار|أعمال/.test(text))         return "تجاري";
  if (/عمالي|عمل|شغل|نقاب/.test(text))            return "عمالي";
  if (/أسرة|زواج|طلاق|نفقة|حضانة/.test(text))    return "عائلي";
  if (/عقار|ملكية|بناء|تعمير/.test(text))         return "عقاري";
  if (/دستور|انتخاب|برلمان/.test(text))           return "دستوري";
  return "مدني";
}

// ── استخراج رقم القانون ───────────────────────────────────────────────
function extractLawNumber(text: string): string | undefined {
  const m = text.match(/رقم\s+(\d{2,3}-\d{2,3})/i)
         || text.match(/(\d{2,3}-\d{2,3})/);
  return m ? m[1] : undefined;
}

// ── تحليل رسالة Telegram → LegalEntry ────────────────────────────────
function parseMessage(msg: {
  message_id: number;
  text?: string;
  caption?: string;
  date: number;
  entities?: { type: string; url?: string }[];
  caption_entities?: { type: string; url?: string }[];
}): LegalEntry | null {
  const rawText = msg.text || msg.caption || "";
  if (rawText.length < 20) return null;

  // استخرج أول سطر كعنوان
  const lines = rawText.split("\n").filter((l) => l.trim().length > 0);
  const title = lines[0].replace(/^[📜📋👑⚖️🏛️📢📰🔄✅❌⚠️•\-*]+\s*/, "").trim();
  if (!title || title.length < 5) return null;

  const summary = lines.slice(1, 4).join(" ").trim() || title;

  // استخرج رابط إن وجد
  const entities = [...(msg.entities || []), ...(msg.caption_entities || [])];
  const urlEntity = entities.find((e) => e.type === "text_link" || e.type === "url");
  const source_url = urlEntity?.url
    || `https://www.joradp.dz/search?q=${encodeURIComponent(title.slice(0, 50))}`;

  const date = new Date(msg.date * 1000).toISOString().split("T")[0];

  return {
    id:         `tg-${msg.message_id}`,
    title,
    law_number: extractLawNumber(rawText),
    type:       classifyType(rawText),
    date,
    source:     "telegram",
    source_url,
    summary,
    category:   classifyCategory(rawText),
    created_at: new Date().toISOString(),
    saved_at:   new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Handler
// ═══════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  // التحقق من CRON_SECRET
  const secret       = req.nextUrl.searchParams.get("secret");
  const authHeader   = req.headers.get("authorization");
  const cronSecret   = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && cronSecret) {
    if (secret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
  }

  if (!BOT_TOKEN || !CHANNEL_ID) {
    return NextResponse.json({
      error: "TELEGRAM_BOT_TOKEN أو TELEGRAM_CHANNEL_ID غير مضبوط في متغيرات البيئة",
      hint:  "أضف TELEGRAM_BOT_TOKEN و TELEGRAM_CHANNEL_ID في Vercel Environment Variables",
    }, { status: 500 });
  }

  try {
    // استدعاء Telegram Bot API — getUpdates أو getHistory
    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=${LIMIT}&allowed_updates=["channel_post"]`;
    const res   = await fetch(tgUrl, { next: { revalidate: 0 } });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `Telegram API error: ${res.status}`, body }, { status: 502 });
    }

    const data = await res.json();

    if (!data.ok || !Array.isArray(data.result)) {
      return NextResponse.json({
        error: "لم يُرجع Telegram بيانات صالحة",
        raw:   data,
      }, { status: 502 });
    }

    // استخرج رسائل القناة فقط
    const messages = data.result
      .filter((u: { channel_post?: unknown }) => u.channel_post)
      .map((u: { channel_post: unknown }) => u.channel_post);

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        message: "لا توجد رسائل جديدة في قناة Telegram",
        synced:  0,
      });
    }

    // تحويل الرسائل إلى مستجدات قانونية
    const entries: LegalEntry[] = messages
      .map(parseMessage)
      .filter((e): e is LegalEntry => e !== null);

    if (entries.length === 0) {
      return NextResponse.json({
        success: true,
        message: "الرسائل لا تحتوي على مستجدات قانونية صالحة",
        synced:  0,
        total_messages: messages.length,
      });
    }

    // حفظ في Redis
    const total = await mergeEntries(entries);

    return NextResponse.json({
      success: true,
      synced:  entries.length,
      total,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[telegram-sync] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const POST = GET; // يدعم الاستدعاء من cron services خارجية
