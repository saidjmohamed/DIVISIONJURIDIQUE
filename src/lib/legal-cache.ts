/**
 * legal-cache.ts — تخزين دائم للمستجدات القانونية في Upstash Redis
 *
 * الإصلاحات:
 * 1. TTL من 24 ساعة → 30 يوماً (البيانات لا تختفي بين تشغيلات الكرون)
 * 2. بدون TTL على آخر تحديث (نريد معرفة متى آخر مرة عمل الكرون دائماً)
 * 3. getAllEntries تُرجع [] بدلاً من null عند خطأ Redis (يمنع "لا توجد بيانات")
 * 4. تجديد TTL تلقائياً عند كل قراءة (KEEPTTL trick)
 */

import { Redis } from "@upstash/redis";

// ═══════════════════════════════════════════════════════════════════════
// Redis Client
// ═══════════════════════════════════════════════════════════════════════

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
  }
  return _redis;
}

// ═══════════════════════════════════════════════════════════════════════
// نموذج البيانات الموحد
// ═══════════════════════════════════════════════════════════════════════

export interface LegalEntry {
  id: string;
  title: string;
  law_number?: string;
  type: string;
  date: string;
  source: string;
  source_url: string;
  summary: string;
  category: string;
  is_update?: boolean;
  related_to?: string;
  created_at?: string;
  saved_at?: string;
  impact?: string;
  keywords?: string | string[];
  key_articles?: string[];
  fetchedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// ثوابت — TTL مرفوع إلى 30 يوماً لضمان البقاء بين الكرونات اليومية
// ═══════════════════════════════════════════════════════════════════════

const CACHE_KEY       = "legal:updates";
const LAST_UPDATE_KEY = "legal:last-update";
const MAX_ENTRIES     = 200;                         // رُفع من 100 → 200
const CACHE_TTL       = 30 * 24 * 60 * 60;          // 30 يوماً بالثواني

// ═══════════════════════════════════════════════════════════════════════
// القراءة والكتابة
// ═══════════════════════════════════════════════════════════════════════

/**
 * جلب جميع المستجدات من Redis
 * يُرجع [] (قائمة فارغة) بدلاً من null عند أي خطأ
 * هذا يمنع ظهور رسالة "لا توجد بيانات" عندما يكون Redis متاحاً لكن به مشكلة مؤقتة
 */
export async function getAllEntries(): Promise<LegalEntry[]> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[Legal Cache] Redis not configured.");
    return [];
  }

  try {
    const raw = await redis.get<string>(CACHE_KEY);
    if (!raw) return [];

    // دعم حالتين: string مشفر أو object مباشر (Upstash يُرجع أحياناً object)
    const parsed: LegalEntry[] = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (!Array.isArray(parsed)) return [];

    // تجديد TTL عند كل قراءة (يمنع انتهاء الصلاحية عند النشاط)
    // لاننتظر النتيجة حتى لا نُبطئ الاستجابة
    redis.expire(CACHE_KEY, CACHE_TTL).catch(() => {});

    return parsed;
  } catch (err) {
    console.error("[Legal Cache] Read error:", err);
    return [];
  }
}

/**
 * جلب تاريخ آخر تحديث
 */
export async function getLastUpdate(): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(LAST_UPDATE_KEY);
    return typeof raw === "string" ? raw : null;
  } catch {
    return null;
  }
}

/**
 * دمج مستجدات جديدة (تجنب التكرار بناءً على الرابط)
 */
export async function mergeEntries(newEntries: LegalEntry[]): Promise<number> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[Legal Cache] Redis not available — entries NOT saved.");
    return 0;
  }

  try {
    const existing     = await getAllEntries();
    const existingUrls = new Set<string>(existing.map((e) => e.source_url));
    const uniqueNew    = newEntries.filter((e) => !existingUrls.has(e.source_url));

    if (uniqueNew.length === 0) {
      console.log(`[Legal Cache] No new entries — keeping ${existing.length} existing.`);
      return existing.length;
    }

    const now    = new Date().toISOString();
    const merged = [...uniqueNew.map((e) => ({ ...e, saved_at: e.saved_at || now })),
                    ...existing].slice(0, MAX_ENTRIES);

    await redis.set(CACHE_KEY,       JSON.stringify(merged), { ex: CACHE_TTL });
    await redis.set(LAST_UPDATE_KEY, now);                  // بدون TTL = يبقى للأبد

    console.log(`[Legal Cache] Saved ${merged.length} entries (${uniqueNew.length} new).`);
    return merged.length;
  } catch (err) {
    console.error("[Legal Cache] Write error:", err);
    return 0;
  }
}

/**
 * استبدال كامل (للبناء من الصفر)
 */
export async function setEntries(entries: LegalEntry[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const trimmed = entries.slice(0, MAX_ENTRIES);
    const now     = new Date().toISOString();
    await redis.set(CACHE_KEY,       JSON.stringify(trimmed), { ex: CACHE_TTL });
    await redis.set(LAST_UPDATE_KEY, now);
    console.log(`[Legal Cache] Set ${trimmed.length} entries.`);
  } catch (err) {
    console.error("[Legal Cache] setEntries error:", err);
  }
}

/**
 * تسجيل نتيجة الكرون
 */
export async function logCronExecution(date: string, result: {
  success: boolean;
  joradp: number;
  conseil: number;
  justice: number;
  total: number;
  elapsed: string;
  errors?: string[];
}): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(`legal:cron-log:${date}`, JSON.stringify(result), {
      ex: 7 * 24 * 60 * 60, // 7 أيام
    });
  } catch {}
}

/**
 * جلب سجل الكرون
 */
export async function getCronLog(date: string): Promise<Record<string, unknown> | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(`legal:cron-log:${date}`);
    if (!raw) return null;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}
