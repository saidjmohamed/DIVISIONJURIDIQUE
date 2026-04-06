/**
 * /api/cron/fetch-updates
 *
 * كرون يومي يجلب المستجدات القانونية من 6 مصادر رسمية جزائرية:
 *  1. الجريدة الرسمية  (JORADP)       — joradp.dz
 *  2. مجلس الدولة      (CONSEIL)      — conseildetat.dz
 *  3. وكالة الأنباء    (APS - سياسة)  — aps.dz/algerie/actualite-nationale
 *  4. رئاسة الجمهورية (APS - رئاسة)  — aps.dz/presidence-news
 *  5. وزارة العدل      (JUSTICE)      — mjustice.dz
 *  6. قناة الشامل      (TELEGRAM)     — t.me/s/elshamill
 *
 * بدون أي SDK خارجي — fetch مباشر لكل مصدر
 */

import { NextRequest, NextResponse } from "next/server";
import { mergeEntries, logCronExecution, type LegalEntry } from "@/lib/legal-cache";

export const dynamic     = "force-dynamic";
export const maxDuration = 60;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0";
const TODAY = new Date().toISOString().split("T")[0];
const YEAR  = new Date().getFullYear();

// ═══════════════════════════════════════════════════════════════════════════
// مساعدات مشتركة
// ═══════════════════════════════════════════════════════════════════════════

function genId(source: string, title: string): string {
  return Buffer.from(`${source}:${title.slice(0, 40)}`).toString("base64url").slice(0, 20);
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "").replace(/&[a-z]+;/g, "")
    .replace(/\s+/g, " ").trim();
}

function classifyType(text: string): string {
  if (/قانون\s+أساسي|قانون\s+عضوي/.test(text))  return "قانون";
  if (/قانون/.test(text))                          return "قانون";
  if (/مرسوم\s+تنفيذي|décret\s+exécutif/i.test(text)) return "مرسوم تنفيذي";
  if (/مرسوم\s+رئاسي|décret\s+présidentiel/i.test(text)) return "مرسوم رئاسي";
  if (/مرسوم/.test(text))                          return "مرسوم تنفيذي";
  if (/قرار|arrêté/i.test(text))                  return "قرار";
  if (/اجتهاد|قضاء/.test(text))                  return "اجتهاد";
  if (/منشور|circulaire/i.test(text))             return "منشور";
  if (/أمر\s+رقم|ordonnance/i.test(text))        return "أمر";
  return "خبر رسمي";
}

function classifyCategory(text: string): string {
  const t = text;
  if (/مدني|عقد|التزام|مسؤولية/.test(t))          return "مدني";
  if (/جزائي|جنائي|عقوب|جريمة/.test(t))           return "جزائي";
  if (/إداري|وظيف|تأديب|صفقات/.test(t))           return "إداري";
  if (/تجاري|شركة|استثمار|أعمال/.test(t))          return "تجاري";
  if (/عمل|شغل|أجر|نقابة|ضمان\s+اجتماعي/.test(t)) return "عمالي";
  if (/أسرة|زواج|طلاق|نفقة|حضانة/.test(t))        return "عائلي";
  if (/عقار|ملكية|بناء|تعمير|أراضي/.test(t))       return "عقاري";
  if (/دستور|انتخاب|برلمان|رئاس|هيئة ناخبة/.test(t)) return "دستوري";
  return "إداري";
}

function extractLawNumber(text: string): string | undefined {
  const m = text.match(/رقم\s+(\d{2,3}-\d{2,3})/i)
         || text.match(/n[°o]\s*(\d{2,3}-\d{2,3})/i)
         || text.match(/(\d{2,3}-\d{2,3})/);
  return m ? m[1] : undefined;
}

// فلتر: هل الخبر ذو طابع قانوني/تشريعي؟
function isLegallyRelevant(text: string): boolean {
  return /مرسوم|قانون|قرار|تشريع|انتخاب|دستور|تعديل|صادق|يوقع|مجلس\s+الوزراء|أمر\s+رقم|منشور|نظام|مرفق/.test(text);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. الجريدة الرسمية — JORADP
// ═══════════════════════════════════════════════════════════════════════════
async function fetchJoradp(): Promise<LegalEntry[]> {
  try {
    const res = await fetch("https://www.joradp.dz/HAR/Index.htm", {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    // استخرج روابط الأعداد الأخيرة
    const links = [...html.matchAll(/href="([^"]*A(?:rab|rab)\w*\.htm[^"]*)"/gi)];
    const entries: LegalEntry[] = links.slice(0, 8).map((m) => ({
      id:         genId("joradp", m[1]),
      title:      `الجريدة الرسمية — ${m[1].match(/(\d+\w+)/)?.[1] || "عدد جديد"}`,
      type:       "خبر رسمي",
      date:       TODAY,
      source:     "joradp",
      source_url: `https://www.joradp.dz${m[1].startsWith("/") ? "" : "/HAR/"}${m[1]}`,
      summary:    "عدد جديد من الجريدة الرسمية الجزائرية — يحتوي على قوانين ومراسيم رسمية",
      category:   "إداري",
      created_at: new Date().toISOString(),
    }));

    return entries.filter(e => e.source_url.includes("joradp.dz"));
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. APS — الأخبار السياسية (قوانين ومراسيم)
// ═══════════════════════════════════════════════════════════════════════════
async function fetchApsPage(url: string, sourceId: string, sourceLabel: string): Promise<LegalEntry[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    // استخرج العناوين والروابط والمقتطفات
    const titleMatches = [...html.matchAll(
      /class="text-lg font-bold[^"]*"[^>]*>([\s\S]*?)<\/[a-z]+>/gi
    )];
    const hrefMatches = [...html.matchAll(
      /class="block w-full h-full"[^>]*href="([^"]+)"/gi
    )];
    const snippetMatches = [...html.matchAll(
      /class="text-sm text-gray-700[^"]*">([\s\S]*?)<\/[a-z]+>/gi
    )];
    const dateMatches = [...html.matchAll(
      /class="text-xs">([\s\S]*?)<\/[a-z]+>/gi
    )];

    const entries: LegalEntry[] = [];

    for (let i = 0; i < Math.min(titleMatches.length, 12); i++) {
      const title   = stripHtml(titleMatches[i][1]);
      const href    = hrefMatches[i]?.[1] || "";
      const snippet = stripHtml(snippetMatches[i]?.[1] || "");
      const rawDate = stripHtml(dateMatches[i]?.[1] || "");

      if (!title || title.length < 15) continue;
      if (!isLegallyRelevant(`${title} ${snippet}`)) continue;

      // تحويل التاريخ من "الاثنين 06 أفريل 2026" إلى ISO
      const dateIso = parseApsDate(rawDate) || TODAY;

      entries.push({
        id:         genId(sourceId, title),
        title,
        law_number: extractLawNumber(title),
        type:       classifyType(title),
        date:       dateIso,
        source:     sourceId,
        source_url: href.startsWith("http") ? href : `https://www.aps.dz${href}`,
        summary:    snippet || title,
        category:   classifyCategory(`${title} ${snippet}`),
        created_at: new Date().toISOString(),
      });
    }

    return entries;
  } catch { return []; }
}

// تحليل تاريخ APS "الاثنين 06 أفريل 2026"
function parseApsDate(raw: string): string {
  const MONTHS: Record<string, string> = {
    "جانفي":"01","فيفري":"02","مارس":"03","أفريل":"04","ماي":"05","جوان":"06",
    "جويلية":"07","أوت":"08","سبتمبر":"09","أكتوبر":"10","نوفمبر":"11","ديسمبر":"12",
  };
  const m = raw.match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (!m) return TODAY;
  const month = MONTHS[m[2]] || "01";
  return `${m[3]}-${month}-${m[1].padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. مجلس الدولة
// ═══════════════════════════════════════════════════════════════════════════
async function fetchConseilEtat(): Promise<LegalEntry[]> {
  try {
    const res = await fetch("https://www.conseildetat.dz", {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const entries: LegalEntry[] = [];

    for (const [, href, rawTitle] of links) {
      const title = stripHtml(rawTitle);
      if (title.length < 20) continue;
      if (!isLegallyRelevant(title) && !/مجلس|قضاء|قرار|اجتهاد/.test(title)) continue;

      entries.push({
        id:         genId("conseildetat", title),
        title,
        type:       classifyType(title),
        date:       TODAY,
        source:     "conseildetat",
        source_url: href.startsWith("http") ? href : `https://www.conseildetat.dz${href}`,
        summary:    `خبر من مجلس الدولة الجزائري: ${title}`,
        category:   classifyCategory(title),
        created_at: new Date().toISOString(),
      });

      if (entries.length >= 8) break;
    }

    return entries;
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. وزارة العدل
// ═══════════════════════════════════════════════════════════════════════════
async function fetchJustice(): Promise<LegalEntry[]> {
  try {
    const res = await fetch("https://www.mjustice.dz", {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const titles = [...html.matchAll(/<(?:h[1-4]|strong)[^>]*>([\s\S]*?)<\/(?:h[1-4]|strong)>/gi)];
    const hrefs  = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>/gi)];
    const entries: LegalEntry[] = [];

    for (let i = 0; i < Math.min(titles.length, 10); i++) {
      const title = stripHtml(titles[i][1]);
      if (title.length < 20) continue;
      const href  = hrefs[i]?.[1] || "https://www.mjustice.dz";

      entries.push({
        id:         genId("justice", title),
        title,
        type:       classifyType(title),
        date:       TODAY,
        source:     "justice",
        source_url: href.startsWith("http") ? href : `https://www.mjustice.dz${href}`,
        summary:    `مستجد من وزارة العدل الجزائرية: ${title}`,
        category:   classifyCategory(title),
        created_at: new Date().toISOString(),
      });
    }

    return entries;
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. قناة الشامل على Telegram
// ═══════════════════════════════════════════════════════════════════════════
async function fetchTelegram(): Promise<LegalEntry[]> {
  try {
    const res = await fetch("https://t.me/s/elshamill", {
      headers: { "User-Agent": UA, "Accept-Language": "ar,en;q=0.9" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const msgBlocks = html.split(/class="tgme_widget_message\s/);
    const entries: LegalEntry[] = [];

    for (const block of msgBlocks.slice(1)) {
      const idM    = block.match(/data-post="elshamill\/(\d+)"/);
      const dateM  = block.match(/datetime="([^"]+)"/);
      const textM  = block.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);

      if (!idM || !textM) continue;

      const rawText = stripHtml(textM[1].replace(/<br\s*\/?>/gi, "\n"));
      if (rawText.length < 40) continue;

      const lines  = rawText.split("\n").filter(l => l.trim().length > 3);
      const title  = lines[0].replace(/^[🤖🏛️📰⚖️✅📡━•\-*]+\s*/, "").trim().slice(0, 200);
      if (title.length < 10) continue;

      // تجاهل رسائل الاختبار
      if (/اختبار الاتصال|تم تفعيل الوكيل/.test(title)) continue;

      entries.push({
        id:         `tg-${idM[1]}`,
        title,
        law_number: extractLawNumber(rawText),
        type:       classifyType(rawText),
        date:       dateM ? dateM[1].slice(0, 10) : TODAY,
        source:     "telegram",
        source_url: `https://t.me/elshamill/${idM[1]}`,
        summary:    lines.slice(1, 4).join(" ").slice(0, 500) || title,
        category:   classifyCategory(rawText),
        created_at: new Date().toISOString(),
      });

      if (entries.length >= 15) break;
    }

    return entries;
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════════════════
// تحسين بـ Groq (سريع + مجاني)
// ═══════════════════════════════════════════════════════════════════════════
async function enhanceWithGroq(entries: LegalEntry[]): Promise<LegalEntry[]> {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY || entries.length === 0) return entries;

  try {
    const list = entries
      .slice(0, 15)
      .map((e, i) => `${i + 1}. ${e.title} — ${e.summary.slice(0, 100)}`)
      .join("\n");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:       "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens:  2000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "أنت محلل قانوني جزائري. حلل كل مستجد وأعد JSON: {\"results\":[{\"summary\":\"ملخص واضح\",\"impact\":\"التأثير القانوني\",\"keywords\":[\"كلمة1\",\"كلمة2\",\"كلمة3\"]}]}. JSON فقط.",
          },
          { role: "user", content: `حلل:\n${list}` },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) return entries;

    const data    = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return entries;

    const parsed = JSON.parse(content) as { results?: Array<{ summary?: string; impact?: string; keywords?: string[] }> };
    const results = parsed?.results || [];

    return entries.map((entry, i) => {
      const ai = results[i];
      if (!ai) return entry;
      return {
        ...entry,
        summary:  ai.summary  || entry.summary,
        impact:   ai.impact   || undefined,
        keywords: ai.keywords || undefined,
      };
    });
  } catch {
    return entries;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Handler الرئيسي
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const cronSecret  = process.env.CRON_SECRET;
    const authHeader  = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");
    if (!cronSecret || (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret)) {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }
  }

  const start   = Date.now();
  const errors: string[] = [];

  // ── جلب من كل المصادر بالتوازي ─────────────────────────────────────────
  const [
    joradpRes,
    apsNatRes,
    apsPrésRes,
    conseilRes,
    justiceRes,
    telegramRes,
  ] = await Promise.allSettled([
    fetchJoradp(),
    fetchApsPage(
      "https://www.aps.dz/algerie/actualite-nationale",
      "aps",
      "وكالة الأنباء — أخبار وطنية"
    ),
    fetchApsPage(
      "https://www.aps.dz/presidence-news",
      "aps-presidence",
      "وكالة الأنباء — أخبار الرئاسة"
    ),
    fetchConseilEtat(),
    fetchJustice(),
    fetchTelegram(),
  ]);

  const collect = (
    res: PromiseSettledResult<LegalEntry[]>,
    label: string
  ): LegalEntry[] => {
    if (res.status === "fulfilled") return res.value;
    errors.push(`${label}: ${res.reason}`);
    return [];
  };

  const allRaw = [
    ...collect(joradpRes,   "JORADP"),
    ...collect(apsNatRes,   "APS-وطني"),
    ...collect(apsPrésRes,  "APS-رئاسة"),
    ...collect(conseilRes,  "مجلس الدولة"),
    ...collect(justiceRes,  "وزارة العدل"),
    ...collect(telegramRes, "Telegram"),
  ];

  // ── إزالة المكررات ────────────────────────────────────────────────────
  const seen    = new Set<string>();
  const unique  = allRaw.filter(e => {
    const key = e.title.trim().slice(0, 50).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── تحسين بـ Groq ───────────────────────────────────────────────────
  const enhanced = await enhanceWithGroq(unique);

  // ── حفظ في Redis ────────────────────────────────────────────────────
  let totalStored = 0;
  if (enhanced.length > 0) {
    totalStored = await mergeEntries(enhanced);
  }

  const elapsed = Date.now() - start;
  const today   = TODAY;

  await logCronExecution(today, {
    success: true,
    joradp:  collect(joradpRes,  "").length,
    conseil: collect(conseilRes, "").length,
    justice: collect(justiceRes, "").length,
    total:   enhanced.length,
    elapsed: `${Math.round(elapsed / 1000)}s`,
    errors:  errors.length > 0 ? errors : undefined,
  });

  return NextResponse.json({
    success: true,
    stats: {
      joradp:        joradpRes.status  === "fulfilled" ? joradpRes.value.length  : 0,
      aps_national:  apsNatRes.status  === "fulfilled" ? apsNatRes.value.length  : 0,
      aps_presidence:apsPrésRes.status === "fulfilled" ? apsPrésRes.value.length : 0,
      conseil_etat:  conseilRes.status === "fulfilled" ? conseilRes.value.length : 0,
      justice:       justiceRes.status === "fulfilled" ? justiceRes.value.length : 0,
      telegram:      telegramRes.status=== "fulfilled" ? telegramRes.value.length: 0,
      total_raw:     allRaw.length,
      duplicates:    allRaw.length - unique.length,
      total_stored:  totalStored,
      elapsed_ms:    elapsed,
    },
    errors:    errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
}

export const POST = GET;
