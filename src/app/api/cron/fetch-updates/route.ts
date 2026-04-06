import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import type { LegalEntry } from "@/lib/legal-cache";
import { mergeEntries, logCronExecution } from "@/lib/legal-cache";

// ═══════════════════════════════════════════════════════════════════════════
// مسار Cron اليومي — جلب المستجدات القانونية من 3 مصادر رسمية
//
// يُستدعى كل يوم الساعة 07:00 UTC عبر Vercel Cron Jobs
// يجلب البيانات بالتوازي → يحسنها بالذكاء الاصطناعي → يخزنها في Redis
// ═══════════════════════════════════════════════════════════════════════════

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Vercel function timeout: 2 minutes

const SOURCES = {
  joradp: {
    name: "الجريدة الرسمية الجزائرية",
    url: "https://www.joradp.dz",
    id: "joradp" as const,
    label: "الجريدة الرسمية",
  },
  conseildetat: {
    name: "مجلس الدولة",
    url: "https://www.conseildetat.dz",
    id: "conseildetat" as const,
    label: "مجلس الدولة",
  },
  justice: {
    name: "وزارة العدل",
    url: "http://www.justice.gov.dz",
    id: "justice" as const,
    label: "وزارة العدل",
  },
};

// ─── Helper: Generate a unique ID ───
function generateId(title: string, source: string): string {
  const hash = Buffer.from(`${source}-${title}-${Date.now()}`).toString("base64url").slice(0, 16);
  return hash;
}

// ─── Helper: Classify content type by keywords ───
function classifyType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("قانون أساسي") || t.includes("قانون عضوي")) return "قانون";
  if (t.includes("قانون")) return "قانون";
  if (t.includes("مرسوم تنفيذي") || t.includes("décret exécutif")) return "مرسوم تنفيذي";
  if (t.includes("مرسوم رئاسي") || t.includes("décret présidentiel")) return "مرسوم رئاسي";
  if (t.includes("مرسوم")) return "مرسوم تنفيذي";
  if (t.includes("قرار") || t.includes("arrêté") || t.includes("decision")) return "قرار";
  if (t.includes("اجتهاد") || t.includes("قرار مجلس") || t.includes("قضاء")) return "اجتهاد";
  if (t.includes("أمر") || t.includes("ordonnance")) return "نص تشريعي";
  if (t.includes("منشور") || t.includes("circulaire")) return "منشور";
  return "خبر رسمي";
}

// ─── Helper: Classify legal category ───
function classifyCategory(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();
  if (text.includes("مدني") || text.includes("عقد") || text.includes("التزام") || text.includes("مسؤولية")) return "مدني";
  if (text.includes("جزائي") || text.includes("جنائي") || text.includes("عقوب") || text.includes("جريمة")) return "جزائي";
  if (text.includes("إداري") || text.includes("دوائر") || text.includes("تأديب") || text.includes("وظيف")) return "إداري";
  if (text.includes("تجاري") || text.includes("شركة") || text.includes("تجار") || text.includes("أعمال")) return "تجاري";
  if (text.includes("عمالي") || text.includes("عمل") || text.includes("شغل") || text.includes("نقاب") || text.includes("ضمان اجتماع")) return "عمالي";
  if (text.includes("أسرة") || text.includes("زواج") || text.includes("طلاق") || text.includes("أحوال شخصية") || text.includes("نفقة") || text.includes("حضانة")) return "عائلي";
  if (text.includes("عقار") || text.includes("ملكية") || text.includes("بناء") || text.includes("تعمير") || text.includes("أراضي")) return "عقاري";
  if (text.includes("دستور") || text.includes("انتخاب") || text.includes("برلمان") || text.includes("رئاس")) return "دستوري";
  return "مدني"; // افتراضي
}

// ─── Helper: Extract law number from title ───
function extractLawNumber(title: string): string | undefined {
  const patterns = [
    /رقم\s+(\d{2,3}-\d{2,3})/i,
    /n[°o]\s*(\d{2,3}-\d{2,3})/i,
    /(\d{2,3}-\d{2,3})/,
  ];
  for (const p of patterns) {
    const match = title.match(p);
    if (match) return match[1];
  }
  return undefined;
}

// ─── Fetch from JORADP (Official Gazette) ───
async function fetchJoradpUpdates(zai: Awaited<ReturnType<typeof ZAI.create>>): Promise<LegalEntry[]> {
  try {
    const searchResult = await zai.functions.invoke("web_search", {
      query: `site:joradp.dz journal officiel algérie 2025 ${new Date().getFullYear()} dernier numéro`,
      num: 10,
    });

    if (!searchResult || !Array.isArray(searchResult)) return [];

    return searchResult.slice(0, 10).map((item: { url?: string; name?: string; snippet?: string; date?: string }) => ({
      id: generateId(item.name || "", "joradp"),
      title: item.name || "وثيقة من الجريدة الرسمية",
      law_number: extractLawNumber(item.name || ""),
      type: classifyType(item.name || ""),
      date: item.date || new Date().toISOString().split("T")[0],
      source: SOURCES.joradp.id,
      source_url: item.url || SOURCES.joradp.url,
      summary: item.snippet || "وثيقة رسمية من الجريدة الرسمية الجزائرية",
      category: classifyCategory(item.name || "", item.snippet || ""),
      created_at: new Date().toISOString(),
    }));
  } catch (error) {
    console.error("[Cron] Error fetching JORADP:", error);
    return [];
  }
}

// ─── Fetch from Conseil d'État (State Council) ───
async function fetchConseilEtatUpdates(zai: Awaited<ReturnType<typeof ZAI.create>>): Promise<LegalEntry[]> {
  try {
    const searchResult = await zai.functions.invoke("web_search", {
      query: `site:conseildetat.dz قرارات أخبار مجلس الدولة الجزائر ${new Date().getFullYear()}`,
      num: 10,
    });

    if (!searchResult || !Array.isArray(searchResult)) return [];

    return searchResult.slice(0, 10).map((item: { url?: string; name?: string; snippet?: string; date?: string }) => ({
      id: generateId(item.name || "", "conseildetat"),
      title: item.name || "قرار من مجلس الدولة",
      law_number: extractLawNumber(item.name || ""),
      type: classifyType(item.name || ""),
      date: item.date || new Date().toISOString().split("T")[0],
      source: SOURCES.conseildetat.id,
      source_url: item.url || SOURCES.conseildetat.url,
      summary: item.snippet || "قرار أو خبر من مجلس الدولة الجزائري",
      category: classifyCategory(item.name || "", item.snippet || ""),
      created_at: new Date().toISOString(),
    }));
  } catch (error) {
    console.error("[Cron] Error fetching Conseil d'État:", error);
    return [];
  }
}

// ─── Fetch from Ministry of Justice ───
async function fetchJusticeUpdates(zai: Awaited<ReturnType<typeof ZAI.create>>): Promise<LegalEntry[]> {
  try {
    const searchResult = await zai.functions.invoke("web_search", {
      query: `site:justice.gov.dz عدالة جزائر مستجدات أخبار ${new Date().getFullYear()}`,
      num: 10,
    });

    if (!searchResult || !Array.isArray(searchResult)) return [];

    return searchResult.slice(0, 10).map((item: { url?: string; name?: string; snippet?: string; date?: string }) => ({
      id: generateId(item.name || "", "justice"),
      title: item.name || "خبر من وزارة العدل",
      law_number: extractLawNumber(item.name || ""),
      type: classifyType(item.name || ""),
      date: item.date || new Date().toISOString().split("T")[0],
      source: SOURCES.justice.id,
      source_url: item.url || SOURCES.justice.url,
      summary: item.snippet || "نشرة أو مستجد من وزارة العدل الجزائرية",
      category: classifyCategory(item.name || "", item.snippet || ""),
      created_at: new Date().toISOString(),
    }));
  } catch (error) {
    console.error("[Cron] Error fetching Justice:", error);
    return [];
  }
}

// ─── AI Enhancement: تلخيص وتحليل المستجدات ───
async function enhanceWithAI(updates: LegalEntry[]): Promise<LegalEntry[]> {
  if (updates.length === 0) return updates;

  try {
    const zai = await ZAI.create();
    const batchSize = 8;
    const enhanced: LegalEntry[] = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const titlesList = batch
        .map((u, idx) => `${idx + 1}. [${u.source}] ${u.title} — ${u.summary}`)
        .join("\n");

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "أنت محلل قانوني جزائري خبير. مهمتك: تحليل كل مستجد قانوني وإرجاع JSON array. " +
              "كل عنصر يحتوي على: enhanced_summary (ملخص بجملة واحدة واضحة)، " +
              "category (من: مدني، جزائي، إداري، تجاري، عمالي، عائلي، عقاري، دستوري)، " +
              "impact (التأثير القانوني بجملة واحدة إن أمكن)، " +
              "key_words (مصفوفة 3-5 كلمات مفتاحية). " +
              "أجب بصيغة JSON array فقط بدون أي نص إضافي أو markdown.",
          },
          {
            role: "user",
            content: `حلل المستجدات التالية:\n${titlesList}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        try {
          const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const analysis = JSON.parse(cleanContent) as Array<{
            enhanced_summary?: string;
            category?: string;
            impact?: string;
            key_words?: string[];
          }>;

          for (let j = 0; j < batch.length; j++) {
            const ai = analysis[j];
            if (ai) {
              enhanced.push({
                ...batch[j],
                summary: ai.enhanced_summary || batch[j].summary,
                category: ai.category || batch[j].category,
                impact: ai.impact,
                keywords: ai.key_words,
              });
            } else {
              enhanced.push(batch[j]);
            }
          }
        } catch {
          // JSON parse failed — keep originals
          enhanced.push(...batch);
        }
      } else {
        enhanced.push(...batch);
      }
    }

    return enhanced;
  } catch (error) {
    console.error("[Cron] AI enhancement failed, using originals:", error);
    return updates;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Cron Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  // Verify cron secret in production
  if (process.env.NODE_ENV === "production") {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");

    if (!cronSecret || (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret)) {
      return NextResponse.json(
        { error: "غير مصرح. يتطلب CRON_SECRET صالح." },
        { status: 403 }
      );
    }
  }

  const startTime = Date.now();
  const allUpdates: LegalEntry[] = [];
  const errors: string[] = [];

  try {
    // Initialize AI SDK
    const zai = await ZAI.create();

    // Fetch from all sources in parallel
    const [joradpResults, conseilResults, justiceResults] = await Promise.allSettled([
      fetchJoradpUpdates(zai),
      fetchConseilEtatUpdates(zai),
      fetchJusticeUpdates(zai),
    ]);

    // Collect results
    if (joradpResults.status === "fulfilled" && joradpResults.value.length > 0) {
      allUpdates.push(...joradpResults.value);
    } else if (joradpResults.status === "rejected") {
      errors.push(`JORADP: ${joradpResults.reason}`);
    }

    if (conseilResults.status === "fulfilled" && conseilResults.value.length > 0) {
      allUpdates.push(...conseilResults.value);
    } else if (conseilResults.status === "rejected") {
      errors.push(`مجلس الدولة: ${conseilResults.reason}`);
    }

    if (justiceResults.status === "fulfilled" && justiceResults.value.length > 0) {
      allUpdates.push(...justiceResults.value);
    } else if (justiceResults.status === "rejected") {
      errors.push(`وزارة العدل: ${justiceResults.reason}`);
    }

    // Deduplicate by title similarity
    const seen = new Set<string>();
    const uniqueUpdates = allUpdates.filter((u) => {
      const key = u.title.trim().toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Enhance with AI
    const enhancedUpdates = uniqueUpdates.length > 0
      ? await enhanceWithAI(uniqueUpdates)
      : uniqueUpdates;

    // Store in Redis via legal-cache module
    let totalStored = 0;
    if (enhancedUpdates.length > 0) {
      totalStored = await mergeEntries(enhancedUpdates);
    }

    const elapsed = Date.now() - startTime;
    const today = new Date().toISOString().split("T")[0];

    // Log cron execution for monitoring
    await logCronExecution(today, {
      success: true,
      joradp: joradpResults.status === "fulfilled" ? joradpResults.value.length : 0,
      conseil: conseilResults.status === "fulfilled" ? conseilResults.value.length : 0,
      justice: justiceResults.status === "fulfilled" ? justiceResults.value.length : 0,
      total: enhancedUpdates.length,
      elapsed: `${Math.round(elapsed / 1000)}s`,
      errors: errors.length > 0 ? errors : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `تم جلب ${enhancedUpdates.length} مستجد قانوني من ${SOURCES.joradp.name} و${SOURCES.conseildetat.name} و${SOURCES.justice.name}`,
      stats: {
        joradp: joradpResults.status === "fulfilled" ? joradpResults.value.length : 0,
        conseil: conseilResults.status === "fulfilled" ? conseilResults.value.length : 0,
        justice: justiceResults.status === "fulfilled" ? justiceResults.value.length : 0,
        total: enhancedUpdates.length,
        duplicates: allUpdates.length - uniqueUpdates.length,
        totalStored,
        elapsed: `${Math.round(elapsed / 1000)}s`,
      },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;

    // Log failure
    const today = new Date().toISOString().split("T")[0];
    await logCronExecution(today, {
      success: false,
      joradp: 0,
      conseil: 0,
      justice: 0,
      total: 0,
      elapsed: `${Math.round(elapsed / 1000)}s`,
      errors: [String(error)],
    });

    console.error("[Cron] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        elapsed: `${Math.round(elapsed / 1000)}s`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for external cron services
export async function POST(req: NextRequest) {
  return GET(req);
}
