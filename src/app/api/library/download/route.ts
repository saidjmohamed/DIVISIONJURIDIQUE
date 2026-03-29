import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const FILES_KEY = "shamil:library:files";
const FILE_DATA_PREFIX = "shamil:library:file:";

interface LibraryFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

function base64ToBuffer(base64: string): Buffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return Buffer.from(bytes);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json({ error: "معرّف الملف مطلوب" }, { status: 400 });
    }

    // Fetch metadata to get file name and content type
    const allFiles: LibraryFile[] = (await redis.get<LibraryFile[]>(FILES_KEY)) || [];
    const fileMeta = allFiles.find((f) => f.id === fileId);

    // Fetch file data from Redis
    const base64Data = await redis.get<string>(`${FILE_DATA_PREFIX}${fileId}`);

    if (!base64Data) {
      return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
    }

    const fileBuffer = base64ToBuffer(base64Data);
    const fileName = fileMeta?.name || fileId;
    const contentType = fileMeta?.type || "application/pdf";

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (error) {
    console.error("[library/download] Error:", error);
    return NextResponse.json({ error: "فشل في تحميل الملف" }, { status: 500 });
  }
}
