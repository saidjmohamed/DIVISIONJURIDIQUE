import { NextRequest, NextResponse } from 'next/server';

/*
 * ── عداد الزوار ──
 * يستخدم Vercel Web Analytics ID + Token لجلب بيانات الزوار
 * للعرض داخل التطبيق نفسه
 *
 * نقطة النهاية:
 *   GET /api/visitors?period=realtime|24h|7d|30d
 */

const ANALYTICS_TOKEN = process.env.ANALYTICS_TOKEN || '';
const PROJECT_ID = process.env.NEXT_PUBLIC_VERCEL_PROJECT_ID || '';
const TEAM_ID = process.env.NEXT_PUBLIC_VERCEL_TEAM_ID || '';

// ذاكرة مؤقتة بسيطة (تعمل داخل نفس البنية الخادمية)
const cache: Record<string, { data: unknown; ts: number }> = {};
const CACHE_TTL = {
  realtime: 10_000,   // 10 ثوانٍ
  '24h':     60_000,   // دقيقة
  '7d':      300_000,  // 5 دقائق
  '30d':     600_000,  // 10 دقائق
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '24h';
  const cacheKey = `${period}`;
  const now = Date.now();

  // تحقق من الذاكرة المؤقتة
  if (cache[cacheKey] && now - cache[cacheKey].ts < (CACHE_TTL[period as keyof typeof CACHE_TTL] || 60_000)) {
    return NextResponse.json({
      ...cache[cacheKey].data as object,
      _cached: true,
    });
  }

  try {
    // طلب 1: المحاول من Vercel Analytics API
    if (ANALYTICS_TOKEN && TEAM_ID) {
      const data = await fetchFromVercelAnalytics(period);
      if (data) {
        cache[cacheKey] = { data, ts: now };
        return NextResponse.json(data);
      }
    }

    // طلب 2: بيانات تقريبية من Vercel Deployments API
    const data = await fetchFromDeploymentsAPI(period);
    cache[cacheKey] = { data, ts: now };
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Visitors API] Error:', error);
    return NextResponse.json(
      { error: 'فشل في جلب بيانات الزوار', visitors: 0, period },
      { status: 500 }
    );
  }
}

async function fetchFromVercelAnalytics(period: string) {
  try {
    const url = `https://api.vercel.com/v2/analytics/events?teamId=${TEAM_ID}&projectId=${PROJECT_ID}&period=${period}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ANALYTICS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: period === 'realtime' ? 10 : 60 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      period,
      visitors: data.visitors || 0,
      pageviews: data.pageviews || 0,
      source: 'vercel-analytics',
    };
  } catch {
    return null;
  }
}

async function fetchFromDeploymentsAPI(period: string) {
  try {
    // استخدام معلومات الـ deployment للإحصائيات التقريبية
    const vercelToken = process.env.VERCEL_TOKEN || '';
    if (!vercelToken) {
      return {
        period,
        visitors: 0,
        pageviews: 0,
        source: 'no-token',
        message: 'لم يتم إعداد رمز التحليلات بعد',
      };
    }

    // جلب آخر النشرات كبيانات تقريبية
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=prj_YKIYh2S3GA1XXiW64P2UEgKbxqGT&limit=5`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );

    if (!res.ok) {
      return { period, visitors: 0, pageviews: 0, source: 'error' };
    }

    const data = await res.json();
    const deployments = data.deployments || [];

    return {
      period,
      visitors: deployments.length > 0 ? 'dashboard' : 0,
      pageviews: 0,
      deployments: deployments.length,
      lastDeploy: deployments[0]?.created || null,
      source: 'deployments-api',
      dashboardUrl: 'https://vercel.com/saidjs-projects-a98f4303/hiyaat-dz/analytics',
    };
  } catch {
    return {
      period,
      visitors: 0,
      pageviews: 0,
      source: 'error',
    };
  }
}
