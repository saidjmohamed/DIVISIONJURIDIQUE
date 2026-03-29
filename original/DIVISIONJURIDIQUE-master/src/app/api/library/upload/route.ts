import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const FILES_KEY = "shamil:library:files";
const FILE_DATA_PREFIX = "shamil:library:file:";
// 10MB limit per file — base64 adds ~33% overhead, so 10MB file → ~13.3MB string
// Upstash Redis supports up to ~100MB per value, but 10MB keeps things safe
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 10;
const MAX_TOTAL_FILES = 200;
const VALID_PIN = "shamil2025";

interface LibraryFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

function generateId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pin = formData.get("pin");

    if (pin !== VALID_PIN) {
      return NextResponse.json(
        { success: false, error: "رمز PIN غير صحيح. استخدم: shamil2025" },
        { status: 403 }
      );
    }

    const files: File[] = [];
    const entries = formData.getAll("files");
    for (const entry of entries) {
      if (entry instanceof File) files.push(entry);
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "لم يتم إرسال أي ملفات" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { success: false, error: `الحد الأقصى ${MAX_FILES_PER_UPLOAD} ملفات في كل عملية رفع` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `حجم "${file.name}" يتجاوز 10 ميغابايت (الحد الأقصى للخادم)` },
          { status: 400 }
        );
      }
    }

    // Get existing metadata from Redis
    const existingFiles: LibraryFile[] = (await redis.get<LibraryFile[]>(FILES_KEY)) || [];
    const newFiles: LibraryFile[] = [];

    for (const file of files) {
      const fileId = generateId();

      // Convert file to base64 and store in Redis
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);

      // Store file data in Redis under individual key
      await redis.set(`${FILE_DATA_PREFIX}${fileId}`, base64Data);

      // Store metadata without file content
      const fileEntry: LibraryFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type || "application/pdf",
        uploadedAt: new Date().toISOString(),
      };

      newFiles.push(fileEntry);
    }

    // Save metadata to Redis (no file content)
    const allFiles = [...existingFiles, ...newFiles];
    const filesToStore = allFiles.length > MAX_TOTAL_FILES
      ? allFiles.slice(allFiles.length - MAX_TOTAL_FILES)
      : allFiles;

    await redis.set(FILES_KEY, filesToStore);

    return NextResponse.json({
      success: true,
      message: `تم رفع ${newFiles.length} ملف بنجاح`,
      files: newFiles,
      totalFiles: filesToStore.length,
    });
  } catch (error) {
    console.error("[library/upload] Error:", error);
    return NextResponse.json(
      { success: false, error: "فشل في رفع الملفات. تأكد من صحة الرمز (PIN: shamil2025)" },
      { status: 500 }
    );
  }
}
