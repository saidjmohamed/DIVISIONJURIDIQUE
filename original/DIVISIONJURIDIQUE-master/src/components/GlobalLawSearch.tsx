'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════
   Law metadata – matches the 7 core JSON files in /public/laws-json/
   ═══════════════════════════════════════════════════════════════ */
const LAW_SOURCES = [
  { id: 'qij',        name: 'ق.إ.ج',   fullName: 'قانون الإجراءات الجزائية',   number: '25-14', icon: '⚖️',  color: '#1a3a5c' },
  { id: 'qima',       name: 'ق.إ.م.إ', fullName: 'قانون الإجراءات المدنية والإدارية', number: '08-09', icon: '🏛️',  color: '#7c3aed' },
  { id: 'penal',      name: 'ق.ع',     fullName: 'قانون العقوبات',              number: '66-156', icon: '🔨',  color: '#dc2626' },
  { id: 'civil',      name: 'ق.م',     fullName: 'القانون المدني',               number: '75-58', icon: '📜',  color: '#059669' },
  { id: 'commercial', name: 'ق.ت',     fullName: 'القانون التجاري',              number: '75-59', icon: '💼',  color: '#d97706' },
  { id: 'maritime',   name: 'ق.ب',     fullName: 'القانون البحري',               number: '76-80', icon: '⛵',  color: '#0284c7' },
  { id: 'family',     name: 'ق.أ',     fullName: 'قانون الأسرة',                 number: '84-11', icon: '👨‍👩‍👧', color: '#e11d48' },
] as const;

type LawId = (typeof LAW_SOURCES)[number]['id'];

/* Shape of a single article inside all.json */
interface LawArticle {
  law: string;   // e.g. "qij"
  num: number;
  text: string;
}

/* Scored result wrapper */
interface ScoredArticle extends LawArticle {
  _score: number;
}

/* ─── Helper: look up metadata by id ─── */
function getLawMeta(lawId: string) {
  return LAW_SOURCES.find(l => l.id === lawId) ?? null;
}

/* ─── Helper: score a single article against a query ─── */
function scoreArticle(article: LawArticle, query: string): number {
  const t = article.text.toLowerCase();
  const q = query.toLowerCase();

  // Exact full-text match (highest)
  if (t === q) return 100;

  // Starts with the query
  if (t.startsWith(q)) return 80;

  // Word-level exact match – every word of query must appear
  const queryWords = q.split(/\s+/);
  const textWords = t.split(/\s+/);
  if (queryWords.every(w => textWords.some(tw => tw === w))) return 70;

  // Count how many query words appear at all (word match)
  const wordHits = queryWords.filter(w => textWords.some(tw => tw.includes(w))).length;
  if (wordHits > 0) return 30 + (wordHits / queryWords.length) * 30;

  // Partial / substring match
  if (t.includes(q)) return 25;

  // Try matching individual query words as substrings
  const partialHits = queryWords.filter(w => t.includes(w)).length;
  if (partialHits > 0) return 10 + (partialHits / queryWords.length) * 15;

  return 0;
}

/* ─── Highlight matched text ─── */
function highlightSnippet(text: string, query: string, maxLen: number = 200): string {
  if (!query.trim()) return text.slice(0, maxLen) + (text.length > maxLen ? '...' : '');

  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? '...' : '');

  // Build a window around the match
  const contextBefore = Math.max(0, idx - 40);
  const contextAfter = Math.min(text.length, idx + query.length + 120);
  let snippet = '';
  if (contextBefore > 0) snippet = '...' + text.slice(contextBefore, contextAfter);
  else snippet = text.slice(0, contextAfter);
  if (contextAfter < text.length) snippet += '...';

  return snippet;
}

/* ═══════════════════════════════════════════════════════════════
   Skeleton shimmer keyframes (injected once via style tag)
   ═══════════════════════════════════════════════════════════════ */
const skeletonStyle = `
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}`;

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
export default function GlobalLawSearch() {
  /* ─── state ─── */
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeLaw, setActiveLaw] = useState<LawId | 'all'>('all');
  const [allArticles, setAllArticles] = useState<LawArticle[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [results, setResults] = useState<ScoredArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── Fetch all.json once on mount ─── */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/laws-json/all.json');
        if (!res.ok) throw new Error('Failed to load');
        const data: LawArticle[] = await res.json();
        if (!cancelled) setAllArticles(data);
      } catch (err) {
        console.error('GlobalLawSearch: failed to load all.json', err);
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  /* ─── Debounce query 300 ms ─── */
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  /* ─── Search whenever debounced query or active law changes ─── */
  useEffect(() => {
    const q = debouncedQuery.trim();

    // If nothing typed, show nothing (don't flood with all articles)
    if (!q) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Use requestAnimationFrame to keep UI responsive during scoring
    const raf = requestAnimationFrame(() => {
      const scored: ScoredArticle[] = [];

      for (const article of allArticles) {
        // Filter by law if one is selected
        if (activeLaw !== 'all' && article.law !== activeLaw) continue;
        const s = scoreArticle(article, q);
        if (s > 0) scored.push({ ...article, _score: s });
      }

      // Sort descending by score, cap at 30
      scored.sort((a, b) => b._score - a._score);
      setResults(scored.slice(0, 30));
      setIsSearching(false);
    });

    return () => cancelAnimationFrame(raf);
  }, [debouncedQuery, activeLaw, allArticles]);

  /* ─── Copy article text ─── */
  const handleCopy = useCallback(async (article: LawArticle) => {
    const meta = getLawMeta(article.law);
    const label = meta ? `${meta.icon} ${meta.fullName} – المادة ${article.num}` : `المادة ${article.num}`;
    const textToCopy = `${label}\n\n${article.text}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(`${article.law}-${article.num}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(`${article.law}-${article.num}`);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  /* ─── WhatsApp share ─── */
  const handleWhatsApp = useCallback((article: LawArticle) => {
    const meta = getLawMeta(article.law);
    const label = meta ? `${meta.icon} ${meta.fullName}` : '';
    const snippet = article.text.length > 300 ? article.text.slice(0, 300) + '...' : article.text;
    const msg = encodeURIComponent(
      `*[${label}] – المادة ${article.num}*\n\n${snippet}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }, []);

  /* ═════════════ Rendering ═════════════ */

  // ─── Loading skeleton while all.json is being fetched ───
  if (isLoadingData) {
    return (
      <div dir="rtl">
        <style>{skeletonStyle}</style>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Search bar skeleton */}
          <div style={{
            height: 52, borderRadius: 16,
            background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
            backgroundSize: '800px 100%',
            animation: 'shimmer 1.5s infinite linear',
          }} />
          {/* Filter bar skeleton */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[80, 64, 72, 56, 64, 72, 56, 48].map((w, i) => (
              <div key={i} style={{
                width: w, height: 36, borderRadius: 30,
                background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
                backgroundSize: '800px 100%',
                animation: 'shimmer 1.5s infinite linear',
              }} />
            ))}
          </div>
          {/* Cards skeleton */}
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              borderRadius: 16, padding: 18,
              background: 'white', border: '1px solid #f1f5f9',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                height: 18, width: '40%', borderRadius: 6, marginBottom: 12,
                background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
                backgroundSize: '800px 100%',
                animation: 'shimmer 1.5s infinite linear',
              }} />
              <div style={{
                height: 14, width: '100%', borderRadius: 6, marginBottom: 8,
                background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
                backgroundSize: '800px 100%',
                animation: 'shimmer 1.5s infinite linear',
              }} />
              <div style={{
                height: 14, width: '75%', borderRadius: 6,
                background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
                backgroundSize: '800px 100%',
                animation: 'shimmer 1.5s infinite linear',
              }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{skeletonStyle}</style>

      {/* ═══════ Search Input ═══════ */}
      <div style={{
        position: 'relative',
        background: 'white',
        borderRadius: 16,
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        overflow: 'hidden',
      }}>
        {/* Gold accent top bar */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #c9a84c 0%, #f0d078 50%, #c9a84c 100%)',
        }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '14px 18px' }}>
          {/* Search icon */}
          <span style={{ fontSize: 20, marginLeft: 12, opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ابحث في جميع القوانين الجزائرية..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 16, fontWeight: 500,
              color: '#1e293b', background: 'transparent',
              fontFamily: 'inherit',
            }}
          />
          {/* Clear button */}
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: '#f1f5f9', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: '#64748b', flexShrink: 0,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f1f5f9')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ═══════ Filter Buttons ═══════ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {/* "All" button */}
        <button
          onClick={() => setActiveLaw('all')}
          style={{
            padding: '8px 16px', borderRadius: 30,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            border: 'none', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 6,
            background: activeLaw === 'all'
              ? 'linear-gradient(135deg, #1a3a5c 0%, #2d5a8a 100%)'
              : '#f1f5f9',
            color: activeLaw === 'all' ? 'white' : '#64748b',
            boxShadow: activeLaw === 'all'
              ? '0 4px 12px rgba(26,58,92,0.3)'
              : 'none',
          }}
        >
          📚 الكل
        </button>

        {/* Per-law buttons */}
        {LAW_SOURCES.map(law => {
          const isActive = activeLaw === law.id;
          return (
            <button
              key={law.id}
              onClick={() => setActiveLaw(isActive ? 'all' : law.id)}
              style={{
                padding: '8px 14px', borderRadius: 30,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: 'none', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6,
                background: isActive
                  ? law.color
                  : '#f1f5f9',
                color: isActive ? 'white' : '#64748b',
                boxShadow: isActive
                  ? `0 4px 12px ${law.color}44`
                  : 'none',
              }}
            >
              <span>{law.icon}</span>
              <span>{law.name}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════ Searching skeleton ═══════ */}
      {isSearching && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              borderRadius: 16, padding: 18,
              background: 'white', border: '1px solid #f1f5f9',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                height: 18, width: '45%', borderRadius: 6, marginBottom: 12,
                background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
                backgroundSize: '800px 100%',
                animation: 'shimmer 1.5s infinite linear',
              }} />
              <div style={{
                height: 14, width: '100%', borderRadius: 6, marginBottom: 8,
                background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
                backgroundSize: '800px 100%',
                animation: 'shimmer 1.5s infinite linear',
              }} />
              <div style={{
                height: 14, width: '60%', borderRadius: 6,
                background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
                backgroundSize: '800px 100%',
                animation: 'shimmer 1.5s infinite linear',
              }} />
            </div>
          ))}
        </div>
      )}

      {/* ═══════ Results ═══════ */}
      {!isSearching && debouncedQuery.trim() && results.length > 0 && (
        <>
          {/* Result count header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 4px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 700, color: '#1a3a5c',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, #c9a84c, #f0d078)',
                color: '#1a3a5c', fontSize: 13, fontWeight: 900,
              }}>
                {results.length}
              </span>
              نتيجة
              {results.length >= 30 && (
                <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>
                  (أقصى 30 نتيجة)
                </span>
              )}
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              البحث في: {activeLaw === 'all' ? 'جميع القوانين' : getLawMeta(activeLaw)?.fullName}
            </span>
          </div>

          {/* Result cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((article) => {
              const meta = getLawMeta(article.law);
              const lawColor = meta?.color ?? '#1a3a5c';
              const uniqueId = `${article.law}-${article.num}`;
              const snippet = highlightSnippet(article.text, debouncedQuery);
              const isCopied = copiedId === uniqueId;

              return (
                <div
                  key={uniqueId}
                  style={{
                    background: 'white',
                    border: '1px solid #f1f5f9',
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'box-shadow 0.2s, transform 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Card top: badge + article number + actions */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '14px 16px 0 16px',
                  }}>
                    {/* Law badge */}
                    {meta && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 12px', borderRadius: 20,
                        background: `${lawColor}14`,
                        color: lawColor,
                        fontSize: 12, fontWeight: 700,
                        border: `1.5px solid ${lawColor}30`,
                        flexShrink: 0,
                      }}>
                        <span>{meta.icon}</span>
                        <span>{meta.name}</span>
                      </span>
                    )}

                    {/* Article number */}
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: '#475569',
                      whiteSpace: 'nowrap',
                    }}>
                      المادة {article.num}
                    </span>

                    {/* Score quality indicator */}
                    <span style={{
                      marginLeft: 'auto', fontSize: 11, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 10,
                      background: article._score >= 70 ? '#dcfce7'
                        : article._score >= 40 ? '#fef9c3'
                        : '#f1f5f9',
                      color: article._score >= 70 ? '#166534'
                        : article._score >= 40 ? '#854d0e'
                        : '#94a3b8',
                      flexShrink: 0,
                    }}>
                      {article._score >= 70 ? '🟢 مطابق' : article._score >= 40 ? '🟡 قريب' : '⚪ جزئي'}
                    </span>
                  </div>

                  {/* Card body: text snippet */}
                  <div style={{
                    padding: '10px 16px 6px 16px',
                    fontSize: 14, lineHeight: 1.85, color: '#334155',
                    fontWeight: 500, whiteSpace: 'pre-line',
                    wordBreak: 'break-word',
                  }}>
                    {snippet}
                  </div>

                  {/* Card footer: law full name + actions */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 16px 14px 16px',
                  }}>
                    <span style={{
                      fontSize: 11, color: '#94a3b8', fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '55%',
                    }}>
                      {meta?.fullName} – رقم {meta?.number}
                    </span>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* Copy button */}
                      <button
                        onClick={() => handleCopy(article)}
                        title={isCopied ? 'تم النسخ!' : 'نسخ المادة'}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '6px 12px', borderRadius: 10,
                          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: isCopied ? '#dcfce7' : '#f1f5f9',
                          color: isCopied ? '#166534' : '#64748b',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          if (!isCopied) e.currentTarget.style.background = '#e2e8f0';
                        }}
                        onMouseLeave={e => {
                          if (!isCopied) e.currentTarget.style.background = '#f1f5f9';
                        }}
                      >
                        {isCopied ? '✅ تم النسخ' : '📋 نسخ'}
                      </button>

                      {/* WhatsApp share */}
                      <button
                        onClick={() => handleWhatsApp(article)}
                        title="مشاركة عبر واتساب"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '6px 12px', borderRadius: 10,
                          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: '#dcfce7', color: '#166534',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#bbf7d0'}
                        onMouseLeave={e => e.currentTarget.style.background = '#dcfce7'}
                      >
                        📲 واتساب
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══════ Empty state ═══════ */}
      {!isSearching && debouncedQuery.trim() && results.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '56px 20px',
          background: '#f8fafc', borderRadius: 20,
          border: '1.5px dashed #e2e8f0',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔎</div>
          <p style={{
            fontSize: 18, fontWeight: 700, color: '#64748b', marginBottom: 6,
          }}>
            لا توجد نتائج
          </p>
          <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, maxWidth: 360, margin: '0 auto' }}>
            جرب كلمات بحث مختلفة، أو غير القانون المحدد في الأزرار أعلاه
          </p>
        </div>
      )}

      {/* ═══════ Idle state (no query yet) ═══════ */}
      {!isSearching && !debouncedQuery.trim() && (
        <div style={{
          textAlign: 'center', padding: '56px 20px',
          background: 'linear-gradient(135deg, #1a3a5c 0%, #2d5a8a 50%, #1a3a5c 100%)',
          borderRadius: 20,
          color: 'white',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: -50, left: -50,
            width: 180, height: 180, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: -40, right: -40,
            width: 140, height: 140, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(45,90,138,0.4) 0%, transparent 70%)',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⚖️</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
              البحث الشامل في القوانين
            </h2>
            <p style={{
              fontSize: 14, lineHeight: 1.8, opacity: 0.75, maxWidth: 420, margin: '0 auto',
            }}>
              اكتب كلمة أو عبارة للبحث في جميع النصوص القانونية الجزائرية.
              <br />
              يشمل البحث {LAW_SOURCES.length} قوانين أساسية.
            </p>

            {/* Quick stat pills */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
              gap: 8, marginTop: 20,
            }}>
              {LAW_SOURCES.map(law => (
                <span key={law.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  fontSize: 12, fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                }}>
                  <span>{law.icon}</span>
                  <span>{law.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
