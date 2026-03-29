import { NextRequest, NextResponse } from "next/server";

interface LibraryFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  telegramFileId: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 30;

    let files: LibraryFile[] = [];

    try {
      const { Redis } = await import("@upstash/redis");
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        files = (await redis.get<LibraryFile[]>("shamil:library:files")) || [];
      }
    } catch {
      // Redis not configured
    }

    // البحث بالاسم (غير حساس للأحرف والتشكيل)
    if (search) {
      const q = search
        .replace(/[\u064B-\u065F]/g, "")
        .replace(/أ|إ|آ/g, "ا")
        .replace(/ة/g, "ه")
        .toLowerCase();
      files = files.filter(f => {
        const name = f.name
          .replace(/[\u064B-\u065F]/g, "")
          .replace(/أ|إ|آ/g, "ا")
          .replace(/ة/g, "ه")
          .toLowerCase();
        return name.includes(q);
      });
    }

    // ترتيب حسب التاريخ (الأحدث أولاً)
    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    // تقسيم الصفحات
    const total = files.length;
    const pages = Math.ceil(total / pageSize);
    const items = files.slice((page - 1) * pageSize, page * pageSize);

    // إحصائيات بأنواع الملفات
    const stats: Record<string, number> = {};
    for (const f of files) {
      const ext = f.name.split(".").pop()?.toLowerCase() || "other";
      stats[ext] = (stats[ext] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      files: items,
      total,
      page,
      pages,
      stats,
    });
  } catch (error) {
    console.error("[library/list] Error:", error);
    return NextResponse.json({ success: true, files: [], total: 0 });
  }
}
