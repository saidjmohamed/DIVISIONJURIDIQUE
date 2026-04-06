import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════
// API المستجدات القانونية — ذاكرة تخزين مؤقت مع TTL 6 ساعات
// ═══════════════════════════════════════════════════════════════════════════

export interface LegalUpdate {
  id: string;
  title: string;
  date: string;
  source: "joradp" | "conseildetat" | "justice";
  sourceLabel: string;
  category: "قانون جديد" | "مرسوم" | "قرار" | "أخبار" | "نص تشريعي";
  summary: string;
  link: string;
  fetchedAt: string;
}

interface CachedData {
  updates: LegalUpdate[];
  updatedAt: string;
  expiresAt: number;
}

// In-memory cache with 6-hour TTL
let cachedData: CachedData | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export const dynamic = "force-dynamic";

// GET: Retrieve cached legal updates
export async function GET() {
  // Return cached data if still valid
  if (cachedData && Date.now() < cachedData.expiresAt) {
    return NextResponse.json({
      updates: cachedData.updates,
      updatedAt: cachedData.updatedAt,
      cached: true,
      total: cachedData.updates.length,
    });
  }

  // Cache expired or empty — return what we have with expired flag
  if (cachedData) {
    return NextResponse.json({
      updates: cachedData.updates,
      updatedAt: cachedData.updatedAt,
      cached: false,
      expired: true,
      total: cachedData.updates.length,
    });
  }

  // No data yet
  return NextResponse.json({
    updates: [],
    updatedAt: null,
    cached: false,
    expired: false,
    total: 0,
    message: "لم يتم جلب أي مستجدات بعد. سيتم التحديث تلقائياً يومياً.",
  });
}

// POST: Add new legal updates (for internal use by cron job)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request with internal secret
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers.get("x-cron-secret");

    if (!cronSecret || providedSecret !== cronSecret) {
      // Also allow if called directly (no secret required for local dev)
      if (process.env.NODE_ENV === "production" && !providedSecret) {
        return NextResponse.json(
          { error: "غير مصرح. مطلوب رأس x-cron-secret صالح." },
          { status: 403 }
        );
      }
    }

    const { updates, merge = true } = body as {
      updates: LegalUpdate[];
      merge?: boolean;
    };

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "بيانات المستجدات غير صالحة أو فارغة." },
        { status: 400 }
      );
    }

    // Validate each update
    for (const update of updates) {
      if (!update.title || !update.source || !update.link) {
        return NextResponse.json(
          { error: "كل مستجد يجب أن يحتوي على عنوان ومصدر ورابط." },
          { status: 400 }
        );
      }
    }

    if (merge && cachedData) {
      // Merge with existing data, avoiding duplicates by link
      const existingLinks = new Set(cachedData.updates.map((u) => u.link));
      const newUpdates = updates.filter((u) => !existingLinks.has(u.link));

      if (newUpdates.length > 0) {
        cachedData = {
          updates: [...newUpdates, ...cachedData.updates].slice(0, 100), // Keep max 100
          updatedAt: new Date().toISOString(),
          expiresAt: Date.now() + CACHE_TTL_MS,
        };
      }
    } else {
      // Replace all data
      cachedData = {
        updates: updates.slice(0, 100),
        updatedAt: new Date().toISOString(),
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
    }

    return NextResponse.json({
      success: true,
      total: cachedData.updates.length,
      added: merge
        ? updates.length - (cachedData ? cachedData.updates.length - updates.length : 0)
        : updates.length,
      updatedAt: cachedData.updatedAt,
    });
  } catch (error) {
    console.error("Legal Updates POST Error:", error);
    return NextResponse.json(
      { error: "خطأ في معالجة البيانات." },
      { status: 500 }
    );
  }
}
