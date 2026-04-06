import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import type { LegalUpdate } from "@/app/api/legal-updates/route";

// ═══════════════════════════════════════════════════════════════════════════
// مسار Cron اليومي — جلب المستجدات القانونية من 3 مصادر رسمية
// ═══════════════════════════════════════════════════════════════════════════

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Vercel function timeout: 2 minutes

const SOURCES = {
  joradp: {
    name: "الجريدة الرسمية الجزائرية",
    url: "https://www.joradp.dz",
    id: "joradp" as const,
  },
  conseildetat: {
    name: "مجلس الدولة",
    url: "https://www.conseildetat.dz",
    id: "conseildetat" as const,
  },
  justice: {
    name: "وزارة العدل",
    url: "http://www.justice.gov.dz",
    id: "justice" as const,
  },
};

// ─── Helper: Generate a unique ID ───
function generateId(title: string, source: string): string {
  const hash = Buffer.from(`${source}-${title}-${Date.now()}`).toString("base64url").slice(0, 16);
  return hash;
}

// ─── Helper: Classify content by keywords ───
function classifyContent(title: string): LegalUpdate["category"] {
  const t = title.toLowerCase();
  if (t.includes("قانون") || t.includes("law") || t.includes("code")) return "قانون جديد";
  if (t.includes("مرسوم") || t.includes("décret") || t.includes("decree")) return "مرسوم";
  if (t.includes("قرار") || t.includes("arrêté") || t.includes("decision")) return "قرار";
  if (t.includes("أمر") || t.includes("ordonnance")) return "نص تشريعي";
  return "أخبار";
}

// ─── Fetch from JORADP (Official Gazette) using web search ───
async function fetchJoradpUpdates(zai: Awaited<ReturnType<typeof ZAI.create>>): Promise<LegalUpdate[]> {
  try {
    const searchResult = await zai.functions.invoke("web_search", {
      query: "site:joradp.dz journal officiel algérie 2025 dernier numéro",
      num: 10,
    });

    if (!searchResult || !Array.isArray(searchResult)) return [];

    const updates: LegalUpdate[] = searchResult.slice(0, 10).map((item: { url?: string; name?: string; snippet?: string; date?: string }) => ({
      id: generateId(item.name || "", "joradp"),
      title: item.name || "وثيقة من الجريدة الرسمية",
      date: item.date || new Date().toISOString().split("T")[0],
      source: "joradp" as const,
      sourceLabel: SOURCES.joradp.name,
      category: classifyContent(item.name || ""),
      summary: item.snippet || "وثيقة رسمية من الجريدة الرسمية الجزائرية",
      link: item.url || SOURCES.joradp.url,
      fetchedAt: new Date().toISOString(),
    }));

    return updates;
  } catch (error) {
    console.error("Error fetching JORADP updates:", error);
    return [];
  }
}

// ─── Fetch from Conseil d'État (State Council) using web search ───
async function fetchConseilEtatUpdates(zai: Awaited<ReturnType<typeof ZAI.create>>): Promise<LegalUpdate[]> {
  try {
    const searchResult = await zai.functions.invoke("web_search", {
      query: "site:conseildetat.dz قرارات أخبار مجلس الدولة الجزائر 2025",
      num: 10,
    });

    if (!searchResult || !Array.isArray(searchResult)) return [];

    const updates: LegalUpdate[] = searchResult.slice(0, 10).map((item: { url?: string; name?: string; snippet?: string; date?: string }) => ({
      id: generateId(item.name || "", "conseildetat"),
      title: item.name || "قرار من مجلس الدولة",
      date: item.date || new Date().toISOString().split("T")[0],
      source: "conseildetat" as const,
      sourceLabel: SOURCES.conseildetat.name,
      category: classifyContent(item.name || ""),
      summary: item.snippet || "قرار أو خبر من مجلس الدولة الجزائري",
      link: item.url || SOURCES.conseildetat.url,
      fetchedAt: new Date().toISOString(),
    }));

    return updates;
  } catch (error) {
    console.error("Error fetching Conseil d'État updates:", error);
    return [];
  }
}

// ─── Fetch from Ministry of Justice using web search ───
async function fetchJusticeUpdates(zai: Awaited<ReturnType<typeof ZAI.create>>): Promise<LegalUpdate[]> {
  try {
    const searchResult = await zai.functions.invoke("web_search", {
      query: "site:justice.gov.dz عدالة جزائر مستجدات أخبار 2025",
      num: 10,
    });

    if (!searchResult || !Array.isArray(searchResult)) return [];

    const updates: LegalUpdate[] = searchResult.slice(0, 10).map((item: { url?: string; name?: string; snippet?: string; date?: string }) => ({
      id: generateId(item.name || "", "justice"),
      title: item.name || "خبر من وزارة العدل",
      date: item.date || new Date().toISOString().split("T")[0],
      source: "justice" as const,
      sourceLabel: SOURCES.justice.name,
      category: classifyContent(item.name || ""),
      summary: item.snippet || "نشرة أو مستجد من وزارة العدل الجزائرية",
      link: item.url || SOURCES.justice.url,
      fetchedAt: new Date().toISOString(),
    }));

    return updates;
  } catch (error) {
    console.error("Error fetching Justice updates:", error);
    return [];
  }
}

// ─── Use AI to summarize and enhance raw results ───
async function enhanceWithAI(updates: LegalUpdate[]): Promise<LegalUpdate[]> {
  try {
    const zai = await ZAI.create();

    // Process in batches to avoid token limits
    const batchSize = 8;
    const enhanced: LegalUpdate[] = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const titlesList = batch
        .map((u, idx) => `${idx + 1}. [${u.sourceLabel}] ${u.title} — ${u.summary}`)
        .join("\n");

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "أنت محلل قانوني جزائري خبير. مهمتك: تلخيخ عناوين المستجدات القانونية بجملة واحدة واضحة ومفيدة بالعربية. أجب بصيغة JSON array فقط بدون أي نص إضافي. كل عنصر يحتوي على حقل 'enhanced_summary' فقط. لا تضف أي نص آخر.",
          },
          {
            role: "user",
            content: `لخص العناوين التالية:\n${titlesList}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        // Try to parse the JSON array
        try {
          const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const summaries = JSON.parse(cleanContent) as { enhanced_summary: string }[];

          for (let j = 0; j < batch.length; j++) {
            if (summaries[j]?.enhanced_summary) {
              enhanced.push({
                ...batch[j],
                summary: summaries[j].enhanced_summary,
              });
            } else {
              enhanced.push(batch[j]);
            }
          }
        } catch {
          // If JSON parsing fails, use original summaries
          enhanced.push(...batch);
        }
      } else {
        enhanced.push(...batch);
      }
    }

    return enhanced;
  } catch (error) {
    console.error("AI enhancement failed, using original summaries:", error);
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
  const allUpdates: LegalUpdate[] = [];
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

    // Enhance summaries with AI
    const enhancedUpdates = uniqueUpdates.length > 0
      ? await enhanceWithAI(uniqueUpdates)
      : uniqueUpdates;

    // Store results via POST to legal-updates API
    if (enhancedUpdates.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

      await fetch(`${baseUrl}/api/legal-updates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CRON_SECRET ? { "x-cron-secret": process.env.CRON_SECRET } : {}),
        },
        body: JSON.stringify({ updates: enhancedUpdates, merge: true }),
      });
    }

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `تم جلب ${enhancedUpdates.length} مستجد قانوني من ${SOURCES.joradp.name} و${SOURCES.conseildetat.name} و${SOURCES.justice.name}`,
      stats: {
        joradp: joradpResults.status === "fulfilled" ? joradpResults.value.length : 0,
        conseil: conseilResults.status === "fulfilled" ? conseilResults.value.length : 0,
        justice: justiceResults.status === "fulfilled" ? justiceResults.value.length : 0,
        total: enhancedUpdates.length,
        duplicates: allUpdates.length - uniqueUpdates.length,
        elapsed: `${Math.round(elapsed / 1000)}s`,
      },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error("Cron fetch-updates error:", error);
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
  // Reuse GET logic
  return GET(req);
}
