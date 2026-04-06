/**
 * /api/telegram-sync
 *
 * يقرأ رسائل قناة @elshamill العامة من t.me/s/elshamill
 * ويحوّلها إلى مستجدات قانونية مخزّنة في Redis لتظهر في التطبيق.
 *
 * لا يحتاج إلى getUpdates أو webhook — يقرأ الصفحة العامة مباشرة.
 */

import { NextRequest, NextResponse } from "next/server";
import { mergeEntries, type LegalEntry } from "@/lib/legal-cache";

export const dynamic     = "force-dynamic";
export const maxDuration = 30;

const CHANNEL_URL = "https://t.me/s/elshamill";

// ── تصنيف النوع ──────────────────────────────────────────────────────
function classifyType(text: string): string {
  if (/قانون\s+أساسي|قانون\s+عضوي/.test(text)) return "قانون";
  if (/قانون/.test(text))                        return "قانون";
  if (/مرسوم\s+تنفيذي/.test(text))              return "مرسوم تنفيذي";
  if (/مرسوم\s+رئاسي/.test(text))               return "مرسوم رئاسي";
  if (/مرسوم/.test(text))                        return "مرسوم تنفيذي";
  if (/قرار/.test(text))                         return "قرار";
  if (/اجتهاد|قضاء/.test(text))                 return "اجتهاد";
  if (/منشور/.test(text))                        return "منشور";
  return "خبر رسمي";
}

// ── تصنيف المجال ─────────────────────────────────────────────────────
function classifyCategory(text: string): string {
  if (/مدني|عقد|التزام|مسؤولية/.test(text))      return "مدني";
  if (/جزائي|جنائي|عقوب|جريمة/.test(text))       return "جزائي";
  if (/إداري|دوائر|تأديب|وظيف/.test(text))       return "إداري";
  if (/تجاري|شركة|تجار|أعمال/.test(text))        return "تجاري";
  if (/عمالي|عمل|شغل|نقاب/.test(text))           return "عمالي";
  if (/أسرة|زواج|طلاق|نفقة|حضانة/.test(text))   return "عائلي";
  if (/عقار|ملكية|بناء|تعمير/.test(text))        return "عقاري";
  if (/دستور|انتخاب|برلمان/.test(text))          return "دستوري";
  return "إداري";
}

// ── استخراج رقم القانون ──────────────────────────────────────────────
function extractLawNumber(text: string): string | undefined {
  const m = text.match(/(?:رقم|مرسوم|قانون)\s+(\d{2,3}-\d{2,3})/i)
         || text.match(/(\d{2,3}-\d{2,3})/);
  return m ? m[1] : undefined;
}

// ── تنظيف HTML ───────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#33;/g, "!")
    .replace(/&[a-z]+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── تحليل HTML للقناة ────────────────────────────────────────────────
interface RawMessage {
  id: string;
  date: string;
  text: string;
  url: string;
}

function parseChannelHtml(html: string): RawMessage[] {
  const msgs: RawMessage[] = [];

  // استخراج كتل الرسائل
  const blockRegex = /data-post="elshamill\/(\d+)"[\s\S]*?(?=data-post="elshamill\/\d+"|$)/g;
  let match: RegExpExecArray | null;

  // طريقة بديلة: استخراج كل رسالة
  const msgBlocks = html.split(/class="tgme_widget_message\s/);

  for (const block of msgBlocks.slice(1)) {
    // معرف الرسالة
    const idMatch   = block.match(/data-post="elshamill\/(\d+)"/);
    const id        = idMatch ? idMatch[1] : "";

    // التاريخ
    const dateMatch = block.match(/datetime="([^"]+)"/);
    const date      = dateMatch ? dateMatch[1].slice(0, 10) : new Date().toISOString().slice(0, 10);

    // النص
    const textMatch = block.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const rawText   = textMatch ? stripHtml(textMatch[1]) : "";

    if (id && rawText.length > 40) {
      msgs.push({
        id,
        date,
        text: rawText,
        url: `https://t.me/elshamill/${id}`,
      });
    }
  }

  // إزالة رسائل المنظومة (اختبار الاتصال)
  return msgs.filter((m) => !m.text.includes("اختبار الاتصال") && !m.text.includes("تم تفعيل الوكيل"));
}

// ── تحويل رسالة → LegalEntry ─────────────────────────────────────────
function toEntry(msg: RawMessage): LegalEntry | null {
  const lines = msg.text.split("\n").filter((l) => l.trim().length > 3);
  if (lines.length === 0) return null;

  // العنوان: أول سطر مفيد (بدون أيقونات)
  const title = lines[0]
    .replace(/^[🤖🏛️📰⚖️✅📡━•\-\*]+\s*/, "")
    .replace(/^تحديث قانوني \(الجزائر\) — /, "")
    .trim()
    .slice(0, 200);

  if (title.length < 10) return null;

  // الملخص: باقي النص
  const summary = lines.slice(1, 5).join(" ").slice(0, 500) || title;

  return {
    id:         `tg-${msg.id}`,
    title,
    law_number: extractLawNumber(msg.text),
    type:       classifyType(msg.text),
    date:       msg.date,
    source:     "telegram",
    source_url: msg.url,
    summary,
    category:   classifyCategory(msg.text),
    created_at: new Date().toISOString(),
    saved_at:   new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Handler
// ═══════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  // التحقق من CRON_SECRET
  const secret     = req.nextUrl.searchParams.get("secret");
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && cronSecret) {
    if (secret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
  }

  try {
    // جلب صفحة القناة العامة
    const res = await fetch(CHANNEL_URL, {
      headers: {
        "User-Agent":      "Mozilla/5.0 (compatible; LegalBot/1.0)",
        "Accept-Language": "ar,en;q=0.9",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `فشل جلب القناة: HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const html    = await res.text();
    const rawMsgs = parseChannelHtml(html);

    if (rawMsgs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "لا توجد رسائل قانونية جديدة في القناة",
        synced:  0,
      });
    }

    // تحويل إلى مستجدات
    const entries: LegalEntry[] = rawMsgs
      .map(toEntry)
      .filter((e): e is LegalEntry => e !== null);

    if (entries.length === 0) {
      return NextResponse.json({
        success: true,
        message: "رسائل القناة لا تحتوي على مستجدات قانونية صالحة",
        synced:  0,
        found:   rawMsgs.length,
      });
    }

    // حفظ في Redis
    const total = await mergeEntries(entries);

    return NextResponse.json({
      success:   true,
      synced:    entries.length,
      total,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[telegram-sync] Error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

export const POST = GET;
