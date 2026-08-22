import { NextResponse } from 'next/server';

const URL = process.env.SUPABASE_URL || 'https://kgsmunxqctpptxljizmy.supabase.co';
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-dakDRrLhmOuu3b1TkTBfg_b5-1bLEr';
const token = (req: Request) => req.headers.get('cookie')?.match(/(?:^|;\s*)dj_admin=([^;]+)/)?.[1] || '';

async function rpc(name: string, body: Record<string, unknown>) {
  const r = await fetch(`${URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  return { ok: r.ok, data: await r.json() };
}

export async function POST(req: Request) {
  const t = token(req); if (!t) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const b = await req.json();
  const x = await rpc('admin_create_jurisprudence', { p_token:t, p_decision_number:b.decision_number, p_decision_date:b.decision_date || null, p_file_number:b.file_number || '', p_chamber:b.chamber || '', p_subject:b.subject, p_legal_principle:b.legal_principle || '', p_summary:b.summary || '', p_full_text:b.full_text, p_related_articles:b.related_articles || [], p_keywords:b.keywords || [], p_source:b.source || '', p_status:b.status || 'published' });
  if (!x.ok || !x.data) return NextResponse.json({ error:'تعذر إضافة الاجتهاد' }, { status: 401 });
  return NextResponse.json({ id:x.data });
}

export async function PATCH(req: Request) {
  const t = token(req); if (!t) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const b = await req.json();
  const x = await rpc('admin_update_jurisprudence', { p_token:t, p_id:b.id, p_decision_number:b.decision_number, p_decision_date:b.decision_date || null, p_file_number:b.file_number || '', p_chamber:b.chamber || '', p_subject:b.subject, p_legal_principle:b.legal_principle || '', p_summary:b.summary || '', p_full_text:b.full_text, p_related_articles:b.related_articles || [], p_keywords:b.keywords || [], p_source:b.source || '', p_status:b.status || 'published' });
  if (!x.ok || x.data !== true) return NextResponse.json({ error:'تعذر تعديل الاجتهاد' }, { status: 401 });
  return NextResponse.json({ ok:true });
}

export async function DELETE(req: Request) {
  const t = token(req); if (!t) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const b = await req.json();
  const x = await rpc('admin_delete_jurisprudence', { p_token:t, p_id:b.id });
  if (!x.ok || x.data !== true) return NextResponse.json({ error:'تعذر حذف الاجتهاد' }, { status: 401 });
  return NextResponse.json({ ok:true });
}
