import { NextResponse } from 'next/server';

// المفتاح publishable مخصص للاستخدام العام، مع حماية البيانات عبر RLS في Supabase.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgsmunxqctpptxljizmy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-dakDRrLhmOuu3b1TkTBfg_b5-1bLEr';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/judicial_directory?select=*&order=type,name`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    });
    if (!response.ok) return NextResponse.json({ error: 'Supabase request failed' }, { status: 502 });
    return NextResponse.json({ data: await response.json(), source: 'supabase', updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[Judicial Institutions API]', error);
    return NextResponse.json({ error: 'تعذر الاتصال بقاعدة بيانات الهيئات القضائية' }, { status: 500 });
  }
}
