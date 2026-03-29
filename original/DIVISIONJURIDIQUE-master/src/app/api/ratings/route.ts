import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// ── اتصال Redis (نفس نمط cloud-storage.ts) ──
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const RATINGS_KEY = "shamil:ratings";
const STATS_KEY = "shamil:rating-stats";
const IPS_KEY = "shamil:rating-ips";

// ── واجهات البيانات ──
interface RatingEntry {
  rating: number;
  comment?: string;
  ip: string;
  timestamp: string;
}

interface RatingStats {
  average: number;
  total: number;
  distribution: number[];
}

interface IpRecord {
  lastRated: string; // ISO timestamp
}

// ── دالة مساعدة: حساب الإحصائيات من مصفوفة التقييمات ──
function computeStats(ratings: RatingEntry[]): RatingStats {
  if (ratings.length === 0) {
    return { average: 0, total: 0, distribution: new Array(10).fill(0) };
  }

  const distribution = new Array(10).fill(0);
  let sum = 0;

  for (const r of ratings) {
    sum += r.rating;
    if (r.rating >= 1 && r.rating <= 10) {
      distribution[r.rating - 1]++;
    }
  }

  return {
    average: Math.round((sum / ratings.length) * 100) / 100,
    total: ratings.length,
    distribution,
  };
}

// ── استخراج IP من الطلب ──
function getClientIp(request: Request): string {
  // x-forwarded-for يمكن أن يحتوي على عدة IPs مفصولة بفواصل
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Fallback
  return "unknown";
}

// ══════════════════════════════════════════════
// GET /api/ratings → إرجاع الإحصائيات
// ══════════════════════════════════════════════
export async function GET() {
  try {
    const stats = await redis.get<RatingStats>(STATS_KEY);

    // إذا كانت الإحصائيات موجودة، نرجعها مباشرة
    if (stats) {
      return NextResponse.json({
        success: true,
        average: stats.average,
        total: stats.total,
        distribution: stats.distribution,
      });
    }

    // إذا لم تكن موجودة، نحسبها من التقييمات
    const ratings = await redis.get<RatingEntry[]>(RATINGS_KEY);
    const computed = computeStats(ratings || []);

    // نخزنها للاستعلامات القادمة
    await redis.set(STATS_KEY, computed, { ex: 86400 }); // تنتهي بعد يوم

    return NextResponse.json({
      success: true,
      ...computed,
    });
  } catch (error) {
    console.error("[ratings GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "فشل في جلب التقييمات" },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════
// POST /api/ratings → إضافة تقييم جديد
// ══════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    // ── 1. استخراج البيانات ──
    const body = await request.json();
    const { rating, comment } = body;

    // ── 2. التحقق من صحة التقييم ──
    if (
      typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 10
    ) {
      return NextResponse.json(
        { success: false, error: "التقييم يجب أن يكون رقماً بين 1 و 10" },
        { status: 400 }
      );
    }

    // ── 3. التحقق من عدم التكرار بالـ IP ──
    const ip = getClientIp(request);
    const ipRecords = (await redis.get<Record<string, IpRecord>>(IPS_KEY)) || {};
    const ipRecord = ipRecords[ip];

    // منع التقييم المتكرر خلال 7 أيام
    if (ipRecord) {
      const lastRated = new Date(ipRecord.lastRated).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      if (now - lastRated < sevenDaysMs) {
        const daysLeft = Math.ceil(
          (sevenDaysMs - (now - lastRated)) / (24 * 60 * 60 * 1000)
        );
        return NextResponse.json(
          {
            success: false,
            error: `لقد قمت بالتقييم مؤخراً. يمكنك إعادة التقييم بعد ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"}`,
            daysLeft,
          },
          { status: 429 }
        );
      }
    }

    // ── 4. حفظ التقييم ──
    const newEntry: RatingEntry = {
      rating,
      comment: typeof comment === "string" ? comment.slice(0, 500) : undefined,
      ip,
      timestamp: new Date().toISOString(),
    };

    // جلب التقييمات الحالية
    const existingRatings = (await redis.get<RatingEntry[]>(RATINGS_KEY)) || [];

    // إضافة التقييم الجديد
    existingRatings.push(newEntry);

    // لا نخزن أكثر من 10000 تقييم لمنع النمو المفرط
    const ratingsToStore =
      existingRatings.length > 10000
        ? existingRatings.slice(existingRatings.length - 10000)
        : existingRatings;

    // حفظ التقييمات في Redis
    await redis.set(RATINGS_KEY, ratingsToStore);

    // ── 5. تحديث سجل الـ IP ──
    ipRecords[ip] = { lastRated: newEntry.timestamp };

    // تنظيف السجلات القديمة (أقدم من 30 يوماً)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const ipKeys = Object.keys(ipRecords);
    for (const key of ipKeys) {
      const record = ipRecords[key];
      if (new Date(record.lastRated).getTime() < thirtyDaysAgo) {
        delete ipRecords[key];
      }
    }
    await redis.set(IPS_KEY, ipRecords);

    // ── 6. حساب وتخزين الإحصائيات المحدثة ──
    const stats = computeStats(ratingsToStore);
    await redis.set(STATS_KEY, stats, { ex: 86400 }); // تنتهي بعد يوم

    // ── 7. إرجاع النتيجة ──
    return NextResponse.json({
      success: true,
      message: "شكراً لتقييمك!",
      average: stats.average,
      total: stats.total,
      distribution: stats.distribution,
    });
  } catch (error) {
    console.error("[ratings POST] Error:", error);

    // التعامل مع خطأ تحليل JSON
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "فشل في حفظ التقييم" },
      { status: 500 }
    );
  }
}
