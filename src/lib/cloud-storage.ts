/**
 * نظام تخزين سحابي باستخدام Upstash Redis
 * Storage → Telegram (للملفات الفعلية)
 * Index → Redis (لسجل الملفات)
 */

import { Redis } from "@upstash/redis";

// Lazy Redis init — prevents crash on missing env vars at build time
let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// مفتاح تخزين الملفات
const KEY = "shamil:cloud-files";

// واجهة بيانات الملف
export interface CloudFile {
  id: string;
  fileName: string;
  fileSize: number;
  category: string;

  // الملف الأصلي (للتحميل)
  originalFileId: string;
  originalMessageId: number;
  mimeType: string;

  description?: string;
  uploadedAt: string;
  contributor?: {
    name?: string;
    surname?: string;
    profession?: string;
    state?: string;
    phone?: string;
    email?: string;
  };

  // للتوافق مع النسخ القديمة
  telegramFileId?: string;
  telegramMessageId?: number;
}

// قراءة الفهرس من Redis
export async function readIndex(): Promise<CloudFile[]> {
  try {
    const redis = getRedis();
    if (!redis) return [];
    const data = await redis.get<CloudFile[]>(KEY);
    return data || [];
  } catch (error) {
    console.error('Error reading from Redis:', error);
    return [];
  }
}

// كتابة الفهرس إلى Redis
export async function writeIndex(files: CloudFile[]): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) return false;
    await redis.set(KEY, files);
    return true;
  } catch (error) {
    console.error('Error writing to Redis:', error);
    return false;
  }
}

// إضافة ملف للفهرس
export async function addFile(file: CloudFile): Promise<boolean> {
  const files = await readIndex();

  // التحقق من عدم التكرار باستخدام originalMessageId
  const exists = files.some(f =>
    f.originalMessageId === file.originalMessageId ||
    f.telegramMessageId === file.originalMessageId ||
    f.originalMessageId === file.telegramMessageId
  );
  if (exists) {
    return false;
  }

  files.unshift(file); // إضافة في البداية
  return writeIndex(files);
}

// حذف ملف من الفهرس
export async function removeFile(id: string): Promise<boolean> {
  const files = await readIndex();
  const filtered = files.filter(f => f.id !== id);
  return writeIndex(filtered);
}

// حذف ملفات متعددة من الفهرس (للمزامنة)
export async function removeFiles(ids: string[]): Promise<boolean> {
  const files = await readIndex();
  const idsSet = new Set(ids);
  const filtered = files.filter(f => !idsSet.has(f.id));
  return writeIndex(filtered);
}

// البحث عن ملف
export async function findFile(id: string): Promise<CloudFile | undefined> {
  const files = await readIndex();
  return files.find(f => f.id === id);
}

// جلب الملفات مع التصفية
export async function getFiles(options?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ files: CloudFile[]; total: number }> {
  let files = await readIndex();

  // تصفية حسب التصنيف
  if (options?.category && options.category !== 'الكل') {
    files = files.filter(f => f.category === options.category);
  }

  // تصفية حسب البحث
  if (options?.search) {
    const search = options.search.toLowerCase();
    files = files.filter(f =>
      f.fileName.toLowerCase().includes(search) ||
      f.description?.toLowerCase().includes(search) ||
      f.contributor?.name?.toLowerCase().includes(search) ||
      f.contributor?.profession?.toLowerCase().includes(search)
    );
  }

  const total = files.length;

  // التصفح
  if (options?.offset) {
    files = files.slice(options.offset);
  }
  if (options?.limit) {
    files = files.slice(0, options.limit);
  }

  return { files, total };
}

// تحديث ملف
export async function updateFile(id: string, updates: Partial<CloudFile>): Promise<boolean> {
  const files = await readIndex();
  const index = files.findIndex(f => f.id === id);

  if (index === -1) return false;

  files[index] = { ...files[index], ...updates };
  return writeIndex(files);
}

// إنشاء معرف فريد
export function generateId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// استيراد ملفات متعددة دفعة واحدة
export async function importFiles(newFiles: CloudFile[]): Promise<{ added: number; skipped: number }> {
  const files = await readIndex();
  // Fix: filter out undefined values to avoid false positives
  const existingIds = new Set(files.map(f => f.telegramMessageId).filter((id): id is number => id != null));

  let added = 0;
  let skipped = 0;

  for (const file of newFiles) {
    if (file.telegramMessageId != null && existingIds.has(file.telegramMessageId)) {
      skipped++;
      continue;
    }
    files.push(file);
    added++;
  }

  await writeIndex(files);
  return { added, skipped };
}

// الحصول على إحصائيات
export async function getStats(): Promise<{
  total: number;
  categories: Record<string, number>;
  lastUpdated: string | null;
}> {
  const files = await readIndex();

  const categories: Record<string, number> = {};
  for (const f of files) {
    categories[f.category] = (categories[f.category] || 0) + 1;
  }

  return {
    total: files.length,
    categories,
    lastUpdated: files[0]?.uploadedAt || null
  };
}
