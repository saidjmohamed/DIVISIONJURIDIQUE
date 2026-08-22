import { NextResponse } from 'next/server';
const URL=process.env.SUPABASE_URL||'https://kgsmunxqctpptxljizmy.supabase.co';
const KEY=process.env.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_-dakDRrLhmOuu3b1TkTBfg_b5-1bLEr';
function token(req:Request){return req.headers.get('cookie')?.match(/(?:^|;\s*)dj_admin=([^;]+)/)?.[1]||''}
export async function GET(req:Request){const t=token(req);if(!t)return NextResponse.json({error:'غير مصرح'},{status:401});try{const r=await fetch(`${URL}/rest/v1/rpc/admin_list_judicial_audit`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify({p_token:t}),cache:'no-store'});if(!r.ok)return NextResponse.json({error:'تعذر تحميل سجل التعديلات'},{status:502});return NextResponse.json({data:await r.json()});}catch{return NextResponse.json({error:'طلب غير صالح'},{status:400})}}
