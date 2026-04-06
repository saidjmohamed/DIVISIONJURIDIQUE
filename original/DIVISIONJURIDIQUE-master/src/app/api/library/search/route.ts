import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// ── اتصال Redis ──
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const FILES_KEY = "shamil:library:files";

// ── واجهة بيانات الملف ──
interface LibraryFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// ══════════════════════════════════════════════
// GET /api/library/search → البحث في الملفات
// ══════════════════════════════════════════════
export async function GET(request: Request) {
  try {
    // ── 1. استخراج معامل البحث ──
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { success: false, error: "معامل البحث 'q' مطلوب ولا يمكن أن يكون فارغاً" },
        { status: 400 }
      );
    }

    const keyword = query.trim().toLowerCase();

    // ── 2. جلب جميع الملفات من Redis ──
    const allFiles: LibraryFile[] = (await redis.get<LibraryFile[]>(FILES_KEY)) || [];

    // ── 3. البحث في أسماء الملفات (غير حساس لحالة الأحرف) ──
    const matchedFiles = allFiles.filter((file) =>
      file.name.toLowerCase().includes(keyword)
    );

    // ── 4. ترتيب النتائج ──
    const results = matchedFiles.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    // ── 5. إرجاع النتيجة ──
    return NextResponse.json({
      success: true,
      query: query.trim(),
      results,
      total: results.length,
    });
  } catch (error) {
    console.error("[library/search GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "فشل في البحث في الملفات" },
      { status: 500 }
    );
  }
}
