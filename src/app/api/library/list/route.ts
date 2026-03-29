import { NextRequest, NextResponse } from "next/server";

interface LibraryFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();

    // Try to fetch from Redis, fallback to empty if not configured
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
      // Redis not configured, return empty
    }

    // Filter by search if provided
    if (search) {
      files = files.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort by date (newest first)
    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    // Return files
    return NextResponse.json({
      success: true,
      files,
      total: files.length,
    });
  } catch (error) {
    console.error("[library/list] Error:", error);
    return NextResponse.json({ success: true, files: [], total: 0 });
  }
}
