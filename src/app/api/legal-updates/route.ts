/**
 * API Route: /api/legal-updates
 * وكيل التحديث القانوني التلقائي — تطبيق الشامل
 * يستقبل ويخزن النصوص القانونية الجديدة في Upstash Redis
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Upstash Redis Client (بدون مكتبة خارجية — HTTP فقط) ────────────────────
async function redisCommand(command: string[], method: 'GET' | 'POST' = 'POST') {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Upstash Redis غير مُعَدّ');

  const res = await fetch(`${url}/${command.map(encodeURIComponent).join('/')}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  return data.result;
}

async function redisSet(key: string, value: unknown) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Upstash Redis غير مُعَدّ');

  await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value)),
  });
}

async function redisGet(key: string) {
  const result = await redisCommand([`get`, key]);
  if (!result) return null;
  try { return JSON.parse(result); } catch { return result; }
}

async function redisLPush(key: string, value: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  await fetch(`${url}/lpush/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
}

async function redisLRange(key: string, start: number, stop: number): Promise<string[]> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return [];
  const res = await fetch(`${url}/lrange/${encodeURIComponent(key)}/${start}/${stop}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.result || [];
}

async function redisLLen(key: string): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return 0;
  const res = await fetch(`${url}/llen/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.result || 0;
}

// ─── مفتاح الأمان ────────────────────────────────────────────────────────────
const AGENT_KEY = process.env.AGENT_API_KEY || 'alshamil-agent-2026';
const REDIS_KEY = 'shamil:legal_updates';
const REDIS_META_KEY = 'shamil:legal_meta';

// ─── POST: حفظ نص قانوني جديد من الوكيل ─────────────────────────────────────
export async function POST(req: NextRequest) {
  // التحقق من المفتاح
  const auth = req.headers.get('authorization') || '';
  if (!auth.includes(AGENT_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.title || !body.source) {
      return NextResponse.json({ error: 'title و source مطلوبان' }, { status: 400 });
    }

    // إضافة معرّف فريد وطابع زمني
    const entry = {
      id: `le_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...body,
      saved_at: new Date().toISOString(),
    };

    // حفظ في القائمة (LPUSH = الأحدث أولاً)
    await redisLPush(REDIS_KEY, JSON.stringify(entry));

    // تحديث الإحصاءات
    const meta = (await redisGet(REDIS_META_KEY)) || { total: 0, lastUpdate: null };
    meta.total = (meta.total || 0) + 1;
    meta.lastUpdate = new Date().toISOString();
    await redisSet(REDIS_META_KEY, meta);

    return NextResponse.json({ success: true, id: entry.id }, { status: 201 });

  } catch (err) {
    console.error('Legal Update POST Error:', err);
    return NextResponse.json({ error: 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}

// ─── GET: استرجاع التحديثات القانونية ────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '0');
  const limit = parseInt(searchParams.get('limit') || '15');
  const category = searchParams.get('category') || '';

  try {
    const start = page * limit;
    const stop = start + limit - 1;

    // جلب الإدخالات من Redis
    const rawItems = await redisLRange(REDIS_KEY, start, stop);
    const total = await redisLLen(REDIS_KEY);
    const meta = await redisGet(REDIS_META_KEY);

    // تحويل من string إلى object
    let entries = rawItems.map(item => {
      try { return JSON.parse(item); } catch { return null; }
    }).filter(Boolean);

    // فلتر حسب التصنيف
    if (category) {
      entries = entries.filter((e: {category?: string}) => e.category === category);
    }

    return NextResponse.json({
      entries,
      total,
      page,
      hasMore: start + limit < total,
      lastUpdate: meta?.lastUpdate || null,
    });

  } catch (err) {
    console.error('Legal GET Error:', err);
    // إذا Redis غير متاح، أرجع قائمة فارغة بدلاً من خطأ
    return NextResponse.json({
      entries: [],
      total: 0,
      page: 0,
      hasMore: false,
      lastUpdate: null,
      _note: 'Redis غير متاح حالياً',
    });
  }
}
