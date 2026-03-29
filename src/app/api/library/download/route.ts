import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json({ error: "معرّف الملف مطلوب" }, { status: 400 });
    }

    if (!BOT_TOKEN) {
      return NextResponse.json({ error: "Telegram Bot غير مضبوط" }, { status: 500 });
    }

    // جلب الميتاداتا من Redis لمعرفة telegramFileId
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const files: any[] = (await redis.get("shamil:library:files")) || [];
    const fileMeta = files.find((f: any) => f.id === fileId);

    if (!fileMeta || !fileMeta.telegramFileId) {
      return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
    }

    // جلب رابط التحميل من تليجرام
    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileMeta.telegramFileId}`
    );

    if (!tgRes.ok) {
      const err = await tgRes.text();
      console.error("[library/download] Telegram getFile error:", err);
      return NextResponse.json({ error: "فشل في الوصول للملف" }, { status: 500 });
    }

    const tgData = await tgRes.json();
    const filePath = tgData?.result?.file_path;

    if (!filePath) {
      return NextResponse.json({ error: "مسار الملف غير موجود" }, { status: 404 });
    }

    // تحميل الملف من تليجرام وإرساله للمستخدم
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    const fileResponse = await fetch(fileUrl);

    if (!fileResponse.ok) {
      return NextResponse.json({ error: "فشل تحميل الملف من تليجرام" }, { status: 500 });
    }

    const fileBuffer = await fileResponse.arrayBuffer();

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": fileMeta.type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileMeta.name)}"`,
        "Content-Length": String(fileBuffer.byteLength),
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("[library/download] Error:", error);
    return NextResponse.json({ error: "فشل في تحميل الملف" }, { status: 500 });
  }
}
