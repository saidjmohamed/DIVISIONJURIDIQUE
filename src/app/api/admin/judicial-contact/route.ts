import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgsmunxqctpptxljizmy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-dakDRrLhmOuu3b1TkTBfg_b5-1bLEr';

function tokenFromCookie(request: Request) {
  return request.headers.get('cookie')?.match(/(?:^|;\s*)dj_admin=([^;]+)/)?.[1] || '';
}

export async function PATCH(request: Request) {
  const token = tokenFromCookie(request);
  if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  try {
    const body = await request.json();
    const contactId = typeof body?.contactId === 'string' ? body.contactId : '';
    const value = typeof body?.value === 'string' ? body.value.trim() : '';
    if (!contactId || !value) return NextResponse.json({ error: 'رقم الهاتف مطلوب' }, { status: 400 });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_update_contact`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token, p_contact_id: contactId, p_value: value }),
      cache: 'no-store',
    });
    if (!response.ok) return NextResponse.json({ error: 'تعذر تعديل الرقم' }, { status: 500 });
    const updated = await response.json();
    if (updated !== true) return NextResponse.json({ error: 'انتهت جلسة المدير أو الرقم غير موجود' }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }
}
