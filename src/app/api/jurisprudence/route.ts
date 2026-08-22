import { NextResponse } from 'next/server';

const URL = process.env.SUPABASE_URL || 'https://kgsmunxqctpptxljizmy.supabase.co';
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-dakDRrLhmOuu3b1TkTBfg_b5-1bLEr';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await fetch(`${URL}/rest/v1/supreme_court_jurisprudence?select=*&status=eq.published&order=decision_date.desc.nullslast,created_at.desc`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      cache: 'no-store',
    });
    if (!r.ok) return NextResponse.json({ error: 'Supabase request failed' }, { status: 502 });
    return NextResponse.json({ data: await r.json(), source: 'supabase' });
  } catch (e) {
    console.error('[Jurisprudence API]', e);
    return NextResponse.json({ error: 'تعذر الاتصال بقاعدة الاجتهادات' }, { status: 500 });
  }
}
