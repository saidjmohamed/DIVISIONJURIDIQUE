import { NextRequest, NextResponse } from "next/server";
import {
  getAllEntries,
  getLastUpdate,
  mergeEntries,
  setEntries,
  type LegalEntry,
} from "@/lib/legal-cache";

// ═══════════════════════════════════════════════════════════════════════════
// API المستجدات القانونية — تخزين دائم في Upstash Redis
//
// GET  → جلب المستجدات مع دعم التصنيف والتصفح (Pagination)
// POST → إضافة مستجدات جديدة (للاستخدام الداخلي من الكرون)
// ═══════════════════════════════════════════════════════════════════════════

export const dynamic = "force-dynamic";

/** استجابة API متوافقة مع الواجهة الأمامية (LegalUpdatesTab.tsx) */
interface LegalUpdatesResponse {
  entries: LegalEntry[];
  total: number;
  hasMore: boolean;
  lastUpdate: string | null;
  message?: string;
}

// ─── GET: جلب المستجدات مع دعم الفلاتر والتصفح ────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const category = searchParams.get("category") || "";

    // جلب البيانات من Redis
    let allEntries = await getAllEntries();

    // إذا لم تكن بيانات في Redis، أرجع قائمة فارغة
    if (!allEntries) {
      return NextResponse.json({
        entries: [],
        total: 0,
        hasMore: false,
        lastUpdate: null,
        message: "لم يتم جلب أي مستجدات بعد. سيتم التحديث تلقائياً يومياً.",
      } satisfies LegalUpdatesResponse);
    }

    // فلتر التصنيف
    if (category) {
      allEntries = allEntries.filter((e) => e.category === category);
    }

    const total = allEntries.length;
    const start = page * limit;
    const end = start + limit;
    const entries = allEntries.slice(start, end);
    const hasMore = end < total;

    const lastUpdate = await getLastUpdate();

    return NextResponse.json({
      entries,
      total,
      hasMore,
      lastUpdate,
    } satisfies LegalUpdatesResponse);
  } catch (error) {
    console.error("[Legal Updates GET] Error:", error);
    return NextResponse.json(
      { error: "فشل في جلب المستجدات القانونية." },
      { status: 500 }
    );
  }
}

// ─── POST: إضافة مستجدات جديدة (من الكرون أو يدوياً) ─────────────────
export async function POST(req: NextRequest) {
  try {
    // التحقق من المصادقة في بيئة الإنتاج
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers.get("x-cron-secret");

    if (process.env.NODE_ENV === "production" && cronSecret && providedSecret !== cronSecret) {
      return NextResponse.json(
        { error: "غير مصرح. مطلوب رأس x-cron-secret صالح." },
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

    // التحقق من الحقول المطلوبة
    for (const entry of entries) {
      if (!entry.title || !entry.source || !entry.source_url) {
        return NextResponse.json(
          { error: "كل مستجد يجب أن يحتوي على عنوان ومصدر ورابط." },
          { status: 400 }
        );
      }
    }

    let total: number;

    if (merge) {
      total = await mergeEntries(entries);
    } else {
      await setEntries(entries);
      total = entries.length;
    }

    return NextResponse.json({
      success: true,
      total,
      added: entries.length,
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
