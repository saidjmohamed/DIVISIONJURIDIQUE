'use client';

import React, { useEffect, useMemo, useState } from 'react';

type DbContact = { id: string; contact_type: string; label: string | null; value: string; source_url: string | null; verified_at: string | null; is_primary: boolean };
type Institution = { id: string; slug: string; name: string; type: string; wilaya: string | null; parent_institution_id: string | null; address: string | null; website: string | null; email: string | null; notes: string | null; contacts: DbContact[] };

const WHATSAPP = '213558357689';
const TYPE_LABEL: Record<string,string> = {
  council: 'مجلس قضاء', court: 'محكمة', administrative_court: 'محكمة إدارية',
  administrative_appellate_court: 'محكمة إدارية للاستئناف', commercial_court: 'محكمة تجارية متخصصة',
  supreme_court: 'المحكمة العليا', state_council: 'مجلس الدولة'
};
const TYPE_ICON: Record<string,string> = { council:'⚖️', court:'🏛️', administrative_court:'🏢', administrative_appellate_court:'⚖️', commercial_court:'💼', supreme_court:'🏛️', state_council:'🏛️' };

function normalize(v: string) { return v.toLocaleLowerCase('ar').replace(/\s+/g,' ').trim(); }
function phoneContacts(i: Institution) { return i.contacts.filter(c => c.contact_type === 'lawyer_delegation_phone' || c.contact_type === 'lawyer_delegation_mobile'); }
function whatsappUrl(i: Institution) { const text = `السلام عليكم، أود الإبلاغ عن خطأ أو طلب تعديل معلومات مندوبية المحامين الخاصة بـ ${i.name}${i.wilaya ? `، ولاية ${i.wilaya}` : ''}.`; return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`; }

export default function JudicialInstitutionsInfo() {
  const [items,setItems] = useState<Institution[]>([]);
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState('');
  const [admin,setAdmin] = useState(false);
  const [loginOpen,setLoginOpen] = useState(false);
  const [password,setPassword] = useState('');
  const [loginError,setLoginError] = useState('');
  const [saving,setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r=await fetch('/api/judicial-institutions',{cache:'no-store'}); const p=await r.json(); setItems(Array.isArray(p.data)?p.data:[]); } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); fetch('/api/admin/session',{cache:'no-store'}).then(r=>r.json()).then(x=>setAdmin(x.authenticated===true)).catch(()=>{}); },[]);

  const filtered = useMemo(()=>{
    const q=normalize(search); if(!q) return items;
    return items.filter(i=>normalize([i.name,i.wilaya||'',TYPE_LABEL[i.type]||'',...i.contacts.map(c=>c.value)].join(' ')).includes(q));
  },[items,search]);
  const byType = (type:string) => filtered.filter(i=>i.type===type);
  const children = (parent:string) => filtered.filter(i=>i.parent_institution_id===parent);

  const login = async () => {
    setLoginError('');
    const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
    const data=await r.json();
    if(!r.ok){setLoginError(data.error||'كلمة السر غير صحيحة');return;}
    setAdmin(true); setLoginOpen(false); setPassword('');
  };
  const logout = async () => { await fetch('/api/admin/logout',{method:'POST'}); setAdmin(false); };
  const editPhone = async (contact:DbContact, institution:Institution) => {
    const next=window.prompt(`تعديل رقم هاتف المندوبية — ${institution.name}`,contact.value);
    if(next===null || !next.trim() || next.trim()===contact.value) return;
    setSaving(true);
    try {
      const r=await fetch('/api/admin/judicial-contact',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:contact.id,value:next.trim()})});
      const data=await r.json(); if(!r.ok) throw new Error(data.error||'تعذر التعديل'); await load();
    } catch(e) { window.alert(e instanceof Error?e.message:'تعذر تعديل الرقم'); } finally { setSaving(false); }
  };

  const Card = ({i}:{i:Institution}) => {
    const phones=phoneContacts(i);
    return <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-blue-900/30">{TYPE_ICON[i.type]||'🏛️'}</span><div><h4 className="font-black text-gray-900 dark:text-white">{i.name}</h4>{i.wilaya&&<div className="mt-1 text-xs text-gray-500">ولاية {i.wilaya}</div>}</div></div><span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">{TYPE_LABEL[i.type]||'هيئة قضائية'}</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60 sm:col-span-2"><div className="mb-2 text-xs font-black text-gray-500">📞 رقم هاتف المندوبية</div>{phones.length?phones.map(c=><div key={c.id} className="mb-2 flex items-center justify-between gap-2 last:mb-0"><a href={`tel:${c.value.replace(/\s/g,'')}`} dir="ltr" className="font-black text-green-700 dark:text-green-300">{c.value}</a>{admin&&<button disabled={saving} onClick={()=>editPhone(c,i)} className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50">✏️ تعديل</button>}</div>):<span className="text-sm text-gray-400">غير مضاف بعد</span>}</div>
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60"><div className="mb-1 text-xs font-bold text-gray-500">✉️ البريد الإلكتروني</div>{i.email?<a className="text-sm font-semibold text-blue-600" href={`mailto:${i.email}`}>{i.email}</a>:<span className="text-sm text-gray-400">غير مضاف بعد</span>}</div>
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60"><div className="mb-1 text-xs font-bold text-gray-500">📍 العنوان</div><span className="text-sm font-semibold">{i.address||'غير مضاف بعد'}</span></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2"><a href={whatsappUrl(i)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white hover:bg-green-700">📲 تواصل معنا لتعديل المعلومات أو الإبلاغ عن خطأ</a>{i.website&&<a href={i.website} target="_blank" rel="noreferrer" className="rounded-xl border px-3 py-2 text-xs font-bold text-blue-600">🌐 الموقع الرسمي</a>}</div>
    </article>;
  };

  const Section = ({title,type,icon}:{title:string,type:string,icon:string}) => { const list=byType(type); if(!list.length) return null; return <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"><div className="flex items-center justify-between border-b p-5 dark:border-gray-800"><div className="flex items-center gap-3"><span className="text-2xl">{icon}</span><div><h3 className="font-black">{title}</h3><p className="text-xs text-gray-500">{list.length} هيئة</p></div></div></div><div className="space-y-3 p-4">{list.map(i=><Card key={i.id} i={i}/>)}</div></section>; };

  const councils=byType('council');
  return <div className="space-y-5" dir="rtl">
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/20"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong>📞 دليل معلومات الهيئات القضائية ومندوبيات المحامين</strong><p className="mt-1 text-xs text-blue-800/80 dark:text-blue-200/80">رقم الهاتف المعروض هو رقم مندوبية المحامين الخاصة بالهيئة.</p></div>{admin?<button onClick={logout} className="rounded-xl bg-gray-800 px-3 py-2 text-xs font-bold text-white">تسجيل خروج المدير</button>:<button onClick={()=>setLoginOpen(true)} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700">🔐 دخول المدير</button>}</div></div>
    <div className="sticky top-[136px] z-30 rounded-2xl border bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900"><div className="relative"><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن هيئة، محكمة، مجلس، ولاية أو رقم هاتف المندوبية..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-10 text-sm outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800" /></div></div>
    {loading?<div className="rounded-2xl bg-white p-8 text-center dark:bg-gray-900">جاري تحميل بيانات الهيئات...</div>:!items.length?<div className="rounded-2xl bg-white p-8 text-center text-gray-500 dark:bg-gray-900">لا توجد بيانات متاحة حاليًا.</div>:search?<div className="space-y-3">{filtered.length?<>{filtered.map(i=><Card key={i.id} i={i}/>)}</>:<div className="rounded-2xl bg-white p-8 text-center text-gray-500 dark:bg-gray-900">لا توجد نتائج مطابقة.</div>}</div>:<>
      {councils.map(c=><section key={c.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"><details open><summary className="cursor-pointer list-none border-b p-5 font-black dark:border-gray-800">⚖️ {c.name} <span className="text-xs font-normal text-gray-400">({children(c.id).length} محكمة)</span></summary><div className="space-y-3 p-4"><Card i={c}/>{children(c.id).map(x=><Card key={x.id} i={x}/>)}</div></details></section>)}
      <Section title="المحاكم الإدارية" type="administrative_court" icon="🏢"/><Section title="المحاكم الإدارية للاستئناف" type="administrative_appellate_court" icon="⚖️"/><Section title="المحاكم التجارية المتخصصة" type="commercial_court" icon="💼"/>
      <Section title="الهيئات القضائية العليا" type="supreme_court" icon="🏛️"/><Section title="مجلس الدولة" type="state_council" icon="🏛️"/>
    </>}
    {loginOpen&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={()=>setLoginOpen(false)}><div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900" onClick={e=>e.stopPropagation()}><h3 className="text-lg font-black">🔐 دخول مدير الدليل</h3><p className="mt-1 text-xs text-gray-500">هذا الدخول مخصص لتعديل أرقام مندوبيات المحامين.</p><input autoFocus type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')login()}} placeholder="كلمة السر" className="mt-5 w-full rounded-xl border p-3 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800"/>{loginError&&<div className="mt-2 text-sm font-bold text-red-600">{loginError}</div>}<div className="mt-4 flex gap-2"><button onClick={login} className="flex-1 rounded-xl bg-blue-700 px-4 py-3 font-black text-white">دخول</button><button onClick={()=>setLoginOpen(false)} className="rounded-xl border px-4 py-3 font-bold">إلغاء</button></div></div></div>}
  </div>;
}
