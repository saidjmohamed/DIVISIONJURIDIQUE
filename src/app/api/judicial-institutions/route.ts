import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgsmunxqctpptxljizmy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!SUPABASE_KEY) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/judicial_directory?select=*&order=type,name`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json({ error: 'Supabase request failed', details: message }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ data, source: 'supabase', updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[Judicial Institutions API]', error);
    return NextResponse.json({ error: 'تعذر الاتصال بقاعدة بيانات الهيئات القضائية' }, { status: 500 });
  }
}
