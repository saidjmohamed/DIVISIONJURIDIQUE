import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgsmunxqctpptxljizmy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';

export async function POST(request: Request) {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)dj_admin=([^;]+)/)?.[1] || '';
  if (!token) return NextResponse.json({ error: 'يلزم تسجيل دخول المدير' }, { status: 401 });
  if (!SUPABASE_KEY) return NextResponse.json({ error: 'إعداد الاتصال بقاعدة البيانات غير مكتمل' }, { status: 503 });

  try {
    const body = await request.json();
    const law = body?.law;
    const markdown = body?.markdown;
    const articles = body?.articles;
    if (!law || typeof law.id !== 'string' || typeof law.title !== 'string' ||
        typeof markdown !== 'string' || !Array.isArray(articles)) {
      return NextResponse.json({ error: 'صيغة بيانات القانون غير صالحة' }, { status: 400 });
    }
    if (markdown.length > 5_000_000 || articles.length > 20_000) {
      return NextResponse.json({ error: 'حجم القانون يتجاوز الحد المسموح' }, { status: 413 });
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_import_legal_law`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_token: token,
        p_law: law,
        p_markdown: markdown,
        p_articles: articles,
        p_publish: body.publish === true,
      }),
      cache: 'no-store',
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof result?.message === 'string' ? result.message : 'تعذر حفظ القانون';
      return NextResponse.json({ error: message }, { status: response.status });
    }
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة طلب الاستيراد' }, { status: 400 });
  }
}
