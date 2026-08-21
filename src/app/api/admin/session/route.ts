import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgsmunxqctpptxljizmy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-dakDRrLhmOuu3b1TkTBfg_b5-1bLEr';

export async function GET(request: Request) {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)dj_admin=([^;]+)/)?.[1] || '';
  if (!token) return NextResponse.json({ authenticated: false });
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_validate_session`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token }),
      cache: 'no-store',
    });
    const valid = response.ok ? await response.json() : false;
    return NextResponse.json({ authenticated: valid === true });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
