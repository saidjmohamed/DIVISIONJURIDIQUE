'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  judicialData,
  wilayaToCouncil,
  commercialCourtsMap,
  adminCourtsData,
  STATS,
  type JurisdictionResult,
} from '@/data/jurisdictions-data';

// ═══ تطبيع النص العربي ═══
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
    .replace(/أ/g, 'ا').replace(/إ/g, 'ا').replace(/آ/g, 'ا').replace(/ٱ/g, 'ا')
    .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i-1][j] + 1, dp[i][j-1] + 1,
        dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
      );
  return dp[m][n];
}

function highlight(text: string, query: string) {
  if (!query || query.length < 2) return text;
  const nt = normalizeArabic(text);
  const nq = normalizeArabic(query);
  const idx = nt.indexOf(nq);
  if (idx === -1) return text;
  let ni = 0, si = -1, ei = -1;
  for (let i = 0; i < text.length; i++) {
    const nc = normalizeArabic(text[i]);
    if (nc) {
      if (ni === idx && si === -1) si = i;
      if (ni === idx + nq.length - 1) { ei = i + 1; break; }
      ni++;
    }
  }
  if (si === -1 || ei === -1) return text;
  return <>{text.substring(0, si)}<mark className="bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded px-0.5">{text.substring(si, ei)}</mark>{text.substring(ei)}</>;
}

// ═══ المكون الرئيسي ═══
export default function JudicialHierarchy() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<JurisdictionResult | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // ═══ فهرس البحث ═══
  const searchIndex = useMemo(() => {
    const idx: {
      municipality: string;
      council: string;
      court: string;
      wilaya: string;
      adminCourt: string;
      adminAppellate: string;
      commercialCourt: string | null;
      isBranch: boolean;
      notEstablished: boolean;
    }[] = [];
    const seen = new Set<string>();

    for (const entry of judicialData) {
      for (const muni of entry.municipalities) {
        const key = `${muni}__${entry.court}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const wilaya = Object.entries(wilayaToCouncil).find(([, v]) => v === entry.council)?.[0] || entry.council;
        const admin = adminCourtsData[wilaya] || { court: `المحكمة الإدارية بـ ${wilaya}`, appellate: 'قيد التحديد' };
        const commercial = commercialCourtsMap[entry.council] || null;

        idx.push({
          municipality: muni,
          council: entry.council,
          court: entry.court,
          wilaya,
          adminCourt: admin.court,
          adminAppellate: admin.appellate,
          commercialCourt: commercial,
          isBranch: !!entry.isBranch,
          notEstablished: !!entry.notEstablished,
        });
      }
    }
    return idx;
  }, []);

  // ═══ البحث ═══
  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 1) return [];
    const nq = normalizeArabic(q);
    const scored: (typeof searchIndex[number] & { score: number })[] = [];

    for (const item of searchIndex) {
      let score = 0;
      const nm = normalizeArabic(item.municipality);
      const nc = normalizeArabic(item.court);
      const nco = normalizeArabic(item.council);
      const nw = normalizeArabic(item.wilaya);

      if (nm === nq) score = 100;
      else if (nm.startsWith(nq)) score = 90;
      else if (nm.includes(nq)) score = 75;
      else if (nc.includes(nq)) score = 50;
      else if (nco.includes(nq)) score = 45;
      else if (nw.includes(nq)) score = 40;
      else if (levenshtein(nq, nm) <= 2) score = 30;
      else {
        let qi = 0;
        for (const ch of nm) { if (qi < nq.length && ch === nq[qi]) qi++; }
        if (qi === nq.length) score = 20;
      }
      if (score > 0) scored.push({ ...item, score });
    }

    scored.sort((a, b) => b.score - a.score || a.municipality.localeCompare(b.municipality, 'ar'));
    return scored.slice(0, 20);
  }, [query, searchIndex]);

  const select = useCallback((r: typeof results[number]) => {
    setSelected(r);
    setQuery('');
    setOpen(false);
    setActive(-1);
  }, []);

  const copyResult = () => {
    if (!selected) return;
    const t = `⚖️ الاختصاص الإقليمي لبلدية ${selected.municipality}:\n🏛️ المحكمة الابتدائية: ${selected.court}\n⚖️ مجلس القضاء: مجلس قضاء ${selected.council}\n📋 المحكمة الإدارية: ${selected.adminCourt}\n📑 المحكمة الإدارية الاستئنافية: ${selected.adminAppellate}\n💼 المحكمة التجارية: ${selected.commercialCourt || 'لا توجد'}`;
    navigator.clipboard.writeText(t);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const close = () => { setSelected(null); setCopied(false); };

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); select(results[active]); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
  };

  // Get same-court municipalities
  const relatedMunis = useMemo(() => {
    if (!selected) return [];
    return judicialData
      .filter(e => e.court === selected.court && e.council === selected.council)
      .flatMap(e => e.municipalities)
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [selected]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Info */}
      <div className="bg-gradient-to-l from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50 text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
        <strong className="text-base">💡 نظام البحث الذكي</strong> — اكتب أي حروف من اسم بلدية، محكمة، أو ولاية وستظهر النتائج فوراً مع كامل تفاصيل الاختصاص القضائي (الابتدائي والإداري والتجاري).
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="bg-blue-100 dark:bg-blue-900/40 px-2.5 py-1 rounded-lg text-xs font-bold">{STATS.councils} مجلس قضاء</span>
          <span className="bg-green-100 dark:bg-green-900/40 px-2.5 py-1 rounded-lg text-xs font-bold">{STATS.courts} محكمة</span>
          <span className="bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-lg text-xs font-bold">{STATS.municipalities} بلدية</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative" ref={wrapRef}>
        <input
          ref={inputRef}
          type="text"
          placeholder="ابحث عن بلدية... (مثال: بئر مراد، وهران، تيزي)"
          className="w-full p-4 pr-12 pl-10 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-blue-500 dark:focus:border-amber-400 outline-none transition-all font-bold text-lg shadow-sm"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => query.trim().length >= 1 && setOpen(true)}
          onKeyDown={onKey}
          autoComplete="off"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm transition-colors">✕</button>
        )}

        {/* Dropdown */}
        <AnimatePresence>
          {open && results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[65vh] flex flex-col">
              <div className="p-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 font-bold flex justify-between px-4">
                <span>{results.length} نتيجة</span>
                <span className="text-gray-400">⌨️ أسهم + Enter</span>
              </div>
              <div className="overflow-y-auto flex-1">
                {results.map((r, i) => (
                  <button key={`${r.municipality}-${r.court}-${i}`}
                    onClick={() => select(r)}
                    onMouseEnter={() => setActive(i)}
                    className={`w-full px-4 py-3 text-right border-b border-gray-50 dark:border-gray-800/50 last:border-none flex items-center gap-3 transition-all ${i === active ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-r-blue-500 dark:border-r-amber-400' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">{highlight(r.municipality, query)}</div>
                      <div className="text-xs text-gray-400 mt-0.5 flex gap-1.5 flex-wrap">
                        <span>🏛️ {r.court}</span>
                        <span>•</span>
                        <span>{r.wilaya}</span>
                        {r.commercialCourt && <span className="text-amber-500">💼</span>}
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${i === active ? 'bg-blue-600 text-white dark:bg-amber-500 dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>اختيار</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          {open && query.trim().length >= 2 && !results.length && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 p-8 text-center">
              <p className="text-3xl mb-2">🔍</p>
              <p className="font-bold text-gray-500">لم يتم العثور على نتائج</p>
              <p className="text-sm text-gray-400 mt-1">جرب كتابة اسم آخر أو جزء من الاسم</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm" onClick={close}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="bg-gradient-to-l from-[#1a5276] to-[#0d2f4a] p-5 text-white sticky top-0 z-10 rounded-t-3xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black">📋 الاختصاص القضائي</h3>
                  <button onClick={close} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-lg hover:bg-white/20 transition-colors">✕</button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Municipality */}
                <div className="bg-gradient-to-l from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-2xl border-r-4 border-amber-400">
                  <p className="text-xs text-gray-500 mb-0.5 font-bold">البلدية</p>
                  <p className="text-2xl font-black text-[#1a5276] dark:text-amber-300">{selected.municipality}</p>
                  <p className="text-sm text-gray-400">ولاية {selected.wilaya}</p>
                </div>

                {/* 5 Cards */}
                <div className="space-y-3">
                  {/* 1. المحكمة الابتدائية */}
                  <div className="flex items-start gap-3 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-xl shrink-0">🏛️</div>
                    <div className="flex-1">
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wide">المحكمة الابتدائية</p>
                      <p className="font-bold text-[#1a5276] dark:text-blue-200">{selected.court}</p>
                      {selected.isBranch && <p className="text-xs text-amber-600 mt-0.5">📌 فرع قضائي</p>}
                      {selected.notEstablished && <p className="text-xs text-amber-600 mt-0.5">⚠️ محكمة غير منصبة بعد — تتبع محكمة {selected.court}</p>}
                    </div>
                  </div>

                  {/* 2. مجلس القضاء */}
                  <div className="flex items-start gap-3 p-3 rounded-2xl border border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-xl shrink-0">⚖️</div>
                    <div className="flex-1">
                      <p className="text-[10px] text-green-500 font-bold uppercase tracking-wide">مجلس القضاء</p>
                      <p className="font-bold text-[#1e8449] dark:text-green-200">مجلس قضاء {selected.council}</p>
                    </div>
                  </div>

                  {/* 3. المحكمة الإدارية الابتدائية */}
                  <div className="flex items-start gap-3 p-3 rounded-2xl border border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-900/10">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-xl shrink-0">📋</div>
                    <div className="flex-1">
                      <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wide">المحكمة الإدارية الابتدائية</p>
                      <p className="font-bold text-[#6c3483] dark:text-purple-200">{selected.adminCourt}</p>
                    </div>
                  </div>

                  {/* 4. المحكمة الإدارية الاستئنافية */}
                  <div className="flex items-start gap-3 p-3 rounded-2xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-xl shrink-0">📑</div>
                    <div className="flex-1">
                      <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wide">المحكمة الإدارية الاستئنافية</p>
                      <p className="font-bold text-[#d35400] dark:text-orange-200">{selected.adminAppellate}</p>
                    </div>
                  </div>

                  {/* 5. المحكمة التجارية المتخصصة */}
                  <div className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center text-xl shrink-0">💼</div>
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">المحكمة التجارية المتخصصة</p>
                      {selected.commercialCourt ? (
                        <p className="font-bold text-[#2e4057] dark:text-slate-200">{selected.commercialCourt}</p>
                      ) : (
                        <p className="font-bold text-[#f39c12] dark:text-amber-400">⚠️ لا توجد محكمة تجارية متخصصة مختصة بهذه البلدية</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Related Municipalities */}
                {relatedMunis.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 mb-2">بلديات أخرى تابعة لمحكمة {selected.court} ({relatedMunis.length})</p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {relatedMunis.map((m, i) => (
                        <button key={i} onClick={() => {
                          const found = searchIndex.find(x => x.municipality === m && x.court === selected.court);
                          if (found) select({ ...found, score: 1 });
                        }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${m === selected.municipality ? 'bg-blue-600 text-white dark:bg-amber-500 dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={copyResult} className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                    {copied ? '✅ تم النسخ' : '📋 نسخ'}
                  </button>
                  <button onClick={() => {
                    const t = `⚖️ الاختصاص القضائي لبلدية ${selected.municipality}:\n🏛️ المحكمة الابتدائية: ${selected.court}\n⚖️ مجلس القضاء: مجلس قضاء ${selected.council}\n📋 المحكمة الإدارية: ${selected.adminCourt}\n📑 المحكمة الإدارية الاستئنافية: ${selected.adminAppellate}\n💼 المحكمة التجارية: ${selected.commercialCourt || 'لا توجد'}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, '_blank');
                  }} className="bg-[#25D366] hover:bg-[#128C7E] text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
                    <span>واتساب</span>📱
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Councils Grid */}
      <div>
        <p className="font-black text-sm text-gray-400 mb-3">المجالس القضائية ({STATS.councils})</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {Array.from(new Set(judicialData.map(d => d.council))).map((council, i) => {
            const count = new Set(judicialData.filter(d => d.council === council).flatMap(d => d.municipalities)).size;
            return (
              <button key={i} onClick={() => { setQuery(council); setOpen(true); inputRef.current?.focus(); }}
                className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-blue-500 dark:hover:border-amber-400 transition-all text-center group">
                <p className="text-[10px] text-gray-400 mb-0.5">مجلس قضاء</p>
                <p className="font-black text-sm text-[#1a5276] dark:text-white group-hover:scale-105 transition-transform leading-tight">{council}</p>
                <p className="text-[10px] text-gray-300 mt-0.5">{count} بلدية</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
