/**
 * legal-cache.ts — طبقة تخزين دائمة للمستجدات القانونية باستخدام Upstash Redis
 *
 * تحل محل الذاكرة المؤقتة الداخلية (In-Memory) التي تفقد البيانات عند إعادة تشغيل الخادم.
 * يستخدم نفس اتصال Redis المُهيأ في rate-limit.ts.
 *
 * Redis Keys:
 *   legal:updates        → JSON string of LegalEntry[]
 *   legal:last-update     → ISO timestamp string
 *   legal:cron-log:YYYY-MM-DD → JSON string of cron execution result
 */

import { Redis } from "@upstash/redis";

// ═══════════════════════════════════════════════════════════════════════
// Redis Client (إعادة استخدام نفس نمط rate-limit.ts)
// ═══════════════════════════════════════════════════════════════════════

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
  }
  return _redis;
}

// ═══════════════════════════════════════════════════════════════════════
// نموذج البيانات الموحد (يتوافق مع الواجهة الأمامية والخلفية)
// ═══════════════════════════════════════════════════════════════════════

export interface LegalEntry {
  id: string;
  title: string;
  law_number?: string;
  type: string;           // قانون، مرسوم تنفيذي، قرار، اجتهاد، خبر رسمي...
  date: string;
  source: string;         // joradp | conseildetat | justice
  source_url: string;
  summary: string;
  category: string;       // مدني، جزائي، إداري، تجاري، عمالي، عائلي، عقاري، دستوري
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
// ثوابت
// ═══════════════════════════════════════════════════════════════════════

const CACHE_KEY = "legal:updates";
const LAST_UPDATE_KEY = "legal:last-update";
const MAX_ENTRIES = 100;
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 ساعة — يكفي حتى الكرون التالي

// ═══════════════════════════════════════════════════════════════════════
// عمليات القراءة والكتابة
// ═══════════════════════════════════════════════════════════════════════

/**
 * جلب جميع المستجدات من Redis
 * يُرجع null إذا لم تكن هناك بيانات أو إذا فشل Redis
 */
export async function getAllEntries(): Promise<LegalEntry[] | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const data = await redis.get<string>(CACHE_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data) as LegalEntry[];
    return parsed;
  } catch (error) {
    console.error("[Legal Cache] Error reading from Redis:", error);
    return null;
  }
}

/**
 * جلب تاريخ آخر تحديث
 */
export async function getLastUpdate(): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    return await redis.get<string>(LAST_UPDATE_KEY);
  } catch {
    return null;
  }
}

/**
 * إضافة مستجدات جديدة مع الدمج (تجنب التكرار بناءً على الرابط)
 * @param newEntries المستجدات الجديدة
 * @returns عدد العناصر الإجمالي بعد الدمج
 */
export async function mergeEntries(newEntries: LegalEntry[]): Promise<number> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[Legal Cache] Redis not available — entries NOT saved.");
    return 0;
  }

  try {
    // جلب البيانات الحالية
    const existing = await getAllEntries();
    const existingLinks = new Set<string>((existing || []).map((e) => e.source_url));

    // إضافة فقط العناصر الجديدة (غير المكررة)
    const uniqueNew = newEntries.filter((e) => !existingLinks.has(e.source_url));

    if (uniqueNew.length === 0) {
      return existing?.length || 0;
    }

    // الدمج: الجديد أولاً ثم القديم، مع حد أقصى
    const merged = [...uniqueNew, ...(existing || [])].slice(0, MAX_ENTRIES);
    const now = new Date().toISOString();

    // تحديث saved_at للعناصر الجديدة
    for (const entry of merged) {
      if (!entry.saved_at && uniqueNew.find((n) => n.id === entry.id)) {
        entry.saved_at = now;
      }
    }

    // تخزين في Redis مع TTL
    await redis.set(CACHE_KEY, JSON.stringify(merged), { ex: CACHE_TTL_SECONDS });
    await redis.set(LAST_UPDATE_KEY, now, { ex: CACHE_TTL_SECONDS });

    console.log(
      `[Legal Cache] Saved ${merged.length} entries (${uniqueNew.length} new) to Redis`
    );

    return merged.length;
  } catch (error) {
    console.error("[Legal Cache] Error writing to Redis:", error);
    return 0;
  }
}

/**
 * استبدال جميع المستجدات (للاستخدام عند إعادة البناء الكاملة)
 */
export async function setEntries(entries: LegalEntry[]): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[Legal Cache] Redis not available — entries NOT saved.");
    return;
  }

  try {
    const trimmed = entries.slice(0, MAX_ENTRIES);
    const now = new Date().toISOString();

    await redis.set(CACHE_KEY, JSON.stringify(trimmed), { ex: CACHE_TTL_SECONDS });
    await redis.set(LAST_UPDATE_KEY, now, { ex: CACHE_TTL_SECONDS });

    console.log(`[Legal Cache] Set ${trimmed.length} entries to Redis`);
  } catch (error) {
    console.error("[Legal Cache] Error writing to Redis:", error);
  }
}

/**
 * تسجيل نتيجة تنفيذ الكرون (للمراقبة والتصحيح)
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
    const key = `legal:cron-log:${date}`;
    await redis.set(key, JSON.stringify(result), { ex: 7 * 24 * 60 * 60 }); // 7 أيام
  } catch (error) {
    console.error("[Legal Cache] Error logging cron execution:", error);
  }
}

/**
 * جلب سجل تنفيذ الكرون
 */
export async function getCronLog(date: string): Promise<Record<string, unknown> | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const data = await redis.get<string>(`legal:cron-log:${date}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}
