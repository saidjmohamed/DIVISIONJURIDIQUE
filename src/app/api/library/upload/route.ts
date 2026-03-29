import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const FILES_KEY = "shamil:library:files";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (Telegram limit)
const MAX_FILES_PER_UPLOAD = 10;
const MAX_TOTAL_FILES = 500;

interface LibraryFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  telegramFileId: string;
}

function generateId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
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
          { success: false, error: `حجم "${file.name}" يتجاوز 50 ميغابايت` },
          { status: 400 }
        );
      }
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { success: false, error: "Telegram Bot غير مضبوط" },
        { status: 500 }
      );
    }

    const existingFiles: LibraryFile[] = (await redis.get<LibraryFile[]>(FILES_KEY)) || [];
    const newFiles: LibraryFile[] = [];

    for (const file of files) {
      const fileId = generateId();

      // رفع الملف لتليجرام
      const telegramForm = new FormData();
      telegramForm.append("document", file);

      const tgRes = await fetch(
        `https://api.telegram.org/bot${botToken}/sendDocument?chat_id=8215710074`,
        {
          method: "POST",
          body: telegramForm,
        }
      );

      if (!tgRes.ok) {
        const tgErr = await tgRes.text();
        console.error("[library/upload] Telegram error:", tgErr);
        return NextResponse.json(
          { success: false, error: `فشل رفع "${file.name}" إلى تليجرام` },
          { status: 500 }
        );
      }

      const tgData = await tgRes.json();
      const telegramFileId = tgData?.result?.document?.file_id;

      if (!telegramFileId) {
        return NextResponse.json(
          { success: false, error: `لم يتم الحصول على معرّف الملف من تليجرام` },
          { status: 500 }
        );
      }

      // حفظ الميتاداتا في Redis فقط (الملف في تليجرام)
      const fileEntry: LibraryFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
        telegramFileId,
      };

      newFiles.push(fileEntry);
    }

    // تحديث قائمة الملفات في Redis
    const allFiles = [...existingFiles, ...newFiles];
    const filesToStore = allFiles.length > MAX_TOTAL_FILES
      ? allFiles.slice(allFiles.length - MAX_TOTAL_FILES)
      : allFiles;

    await redis.set(FILES_KEY, filesToStore);

    return NextResponse.json({
      success: true,
      message: `تم رفع ${newFiles.length} ملف بنجاح إلى المكتبة`,
      files: newFiles,
      totalFiles: filesToStore.length,
    });
  } catch (error) {
    console.error("[library/upload] Error:", error);
    return NextResponse.json(
      { success: false, error: "فشل في رفع الملفات" },
      { status: 500 }
    );
  }
}
