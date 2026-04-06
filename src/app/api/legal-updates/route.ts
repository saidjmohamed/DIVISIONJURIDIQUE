import { NextRequest, NextResponse } from "next/server";
import {
  getAllEntries,
  getLastUpdate,
  mergeEntries,
  setEntries,
  type LegalEntry,
} from "@/lib/legal-cache";

// ═══════════════════════════════════════════════════════════════════════════
// API المستجدات القانونية
//
// GET  → جلب المستجدات مع دعم التصنيف والتصفح
// POST → إضافة مستجدات جديدة (من الكرون أو Telegram agent)
// ═══════════════════════════════════════════════════════════════════════════

export const dynamic = "force-dynamic";

interface LegalUpdatesResponse {
  entries: LegalEntry[];
  total: number;
  hasMore: boolean;
  lastUpdate: string | null;
  message?: string;
}

// ─── GET ──────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page     = Math.max(0, parseInt(searchParams.get("page")  || "0",  10));
    const limit    = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const category = searchParams.get("category") || "";

    // getAllEntries الآن دائماً تُرجع [] لا null
    let allEntries = await getAllEntries();

    if (category) {
      allEntries = allEntries.filter((e) => e.category === category);
    }

    const total    = allEntries.length;
    const start    = page * limit;
    const entries  = allEntries.slice(start, start + limit);
    const hasMore  = start + limit < total;
    const lastUpdate = await getLastUpdate();

    return NextResponse.json({
      entries,
      total,
      hasMore,
      lastUpdate,
      ...(total === 0 ? {
        message: "سيتم التحديث تلقائياً كل يوم الساعة 07:00. إذا لم تظهر نتائج، تحقق من إعدادات Redis.",
      } : {}),
    } satisfies LegalUpdatesResponse);

  } catch (error) {
    console.error("[Legal Updates GET] Error:", error);
    return NextResponse.json(
      { error: "فشل في جلب المستجدات القانونية." },
      { status: 500 }
    );
  }
}

// ─── POST — يقبل الطلبات من: الكرون، Telegram agent، أو يدوياً ──────────
export async function POST(req: NextRequest) {
  try {
    // التحقق من المصادقة في الإنتاج
    const cronSecret      = process.env.CRON_SECRET;
    const providedSecret  = req.headers.get("x-cron-secret")
                         || req.headers.get("authorization")?.replace("Bearer ", "");

    if (process.env.NODE_ENV === "production" && cronSecret && providedSecret !== cronSecret) {
      return NextResponse.json(
        { error: "غير مصرح. مطلوب CRON_SECRET صالح." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { entries, merge = true } = body as {
      entries: LegalEntry[];
      merge?: boolean;
    };

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "بيانات المستجدات غير صالحة أو فارغة." },
        { status: 400 }
      );
    }

    // التحقق من الحقول المطلوبة — title فقط إلزامي (source_url اختياري)
    const valid = entries.filter((e) => e.title && e.title.length > 3);
    if (valid.length === 0) {
      return NextResponse.json(
        { error: "لم يتم العثور على مستجدات صالحة." },
        { status: 400 }
      );
    }

    // تأكد من وجود source_url افتراضي
    const normalized = valid.map((e) => ({
      ...e,
      source_url: e.source_url || `https://www.joradp.dz/search?q=${encodeURIComponent(e.title)}`,
    }));

    const total = merge
      ? await mergeEntries(normalized)
      : (await setEntries(normalized), normalized.length);

    return NextResponse.json({
      success: true,
      total,
      added:     normalized.length,
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[Legal Updates POST] Error:", error);
    return NextResponse.json(
      { error: "خطأ في معالجة البيانات." },
      { status: 500 }
    );
  }
}
