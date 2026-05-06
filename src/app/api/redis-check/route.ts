import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { checkRateLimit } from "@/lib/ai-core";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Rate limiting: 10 طلب في الدقيقة
  const rateCheck = await checkRateLimit(req, { key: "redis-check", limit: 10, window: 60 });
  if (rateCheck.limited) {
    return NextResponse.json({ error: rateCheck.errorMessage }, { status: 429 });
  }

  // مصادقة: يتطلب CRON_SECRET في الإنتاج
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.NODE_ENV === "production" && cronSecret && authHeader !== cronSecret) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return NextResponse.json({ error: "متغيرات Redis غير مضبوطة", url: !!url, token: !!token });
  }

  try {
    const redis = new Redis({ url, token });

    // اختبار SET
    await redis.set("test:ping", "pong", { ex: 60 });

    // اختبار GET
    const val = await redis.get("test:ping");

    // اختبار legal:updates
    const updates = await redis.get("legal:updates");
    const count   = Array.isArray(updates)
      ? updates.length
      : typeof updates === "string"
        ? JSON.parse(updates).length
        : 0;

    return NextResponse.json({
      redis:    "متصل",
      ping:     val === "pong" ? "ok" : "fail",
      entries:  count,
      // لا نعرض أي جزء من URL لحماية الأمان
    });
  } catch (err) {
    return NextResponse.json({
      error:   String(err),
      url_ok:  !!url,
      tok_ok:  !!token,
    }, { status: 500 });
  }
}
