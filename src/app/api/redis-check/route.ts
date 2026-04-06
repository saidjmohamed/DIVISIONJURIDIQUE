import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

export async function GET() {
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
      redis:    "✅ متصل",
      ping:     val === "pong" ? "✅" : "❌",
      entries:  count,
      url_prefix: url.slice(0, 30) + "...",
    });
  } catch (err) {
    return NextResponse.json({
      error:   String(err),
      url_ok:  !!url,
      tok_ok:  !!token,
    }, { status: 500 });
  }
}
