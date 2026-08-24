import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgsmunxqctpptxljizmy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/platform_updates?select=id,title,description,category,icon,created_at&published=eq.true&order=created_at.desc&limit=30`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' }
    );
    if (!response.ok) return NextResponse.json({ error: 'تعذر جلب آخر تحديثات المنصة' }, { status: 502 });
    return NextResponse.json({ data: await response.json() });
  } catch (error) {
    console.error('[Platform Updates API]', error);
    return NextResponse.json({ error: 'تعذر الاتصال بقاعدة البيانات' }, { status: 500 });
  }
}
