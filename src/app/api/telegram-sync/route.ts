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
import { classifyType, classifyCategory, extractLawNumber, stripHtml } from "@/lib/legal-utils";

export const dynamic     = "force-dynamic";
export const maxDuration = 30;

const CHANNEL_URL = "https://t.me/s/elshamill";

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
    const rawText   = textMatch ? stripHtml(textMatch[1], true) : "";

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
