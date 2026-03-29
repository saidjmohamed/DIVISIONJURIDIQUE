import { NextResponse } from "next/server";

const ADMIN_PIN = process.env.LIBRARY_ADMIN_PIN || "shamil2025";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");
    const pin = searchParams.get("pin");

    if (!fileId) {
      return NextResponse.json({ error: "معرّف الملف مطلوب" }, { status: 400 });
    }

    // التحقق من PIN (المسؤول فقط)
    if (pin !== ADMIN_PIN) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية حذف الملفات" },
        { status: 403 }
      );
    }

    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const FILES_KEY = "shamil:library:files";
    const files: any[] = (await redis.get(FILES_KEY)) || [];

    const fileIndex = files.findIndex((f: any) => f.id === fileId);
    if (fileIndex === -1) {
      return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
    }

    files.splice(fileIndex, 1);
    await redis.set(FILES_KEY, files);

    return NextResponse.json({
      success: true,
      message: "تم حذف الملف من المكتبة",
      totalFiles: files.length,
    });
  } catch (error) {
    console.error("[library/delete] Error:", error);
    return NextResponse.json({ error: "فشل في حذف الملف" }, { status: 500 });
  }
}
