import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgsmunxqctpptxljizmy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-dakDRrLhmOuu3b1TkTBfg_b5-1bLEr';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = typeof body?.password === 'string' ? body.password : '';
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_login`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_password: password }),
      cache: 'no-store',
    });
    if (!response.ok) return NextResponse.json({ error: 'تعذر التحقق من حساب المدير' }, { status: 500 });
    const token = await response.json();
    if (!token) return NextResponse.json({ error: 'كلمة السر غير صحيحة' }, { status: 401 });
    const result = NextResponse.json({ ok: true });
    result.cookies.set('dj_admin', String(token), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12 });
    return result;
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }
}
