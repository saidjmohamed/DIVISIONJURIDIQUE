'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LawMeta {
  id: string;
  name: string;
  fullName?: string;
  file: string;
  count: number;
  number: string;
  icon: string;
  color: string;
  category?: string;
}

interface LawArticle {
  num: number;
  number: string;
  text: string;
}

interface LawArticleWithLaw extends LawArticle {
  law: string;
}

interface ScoredArticle extends LawArticleWithLaw {
  _score: number;
}

// ─── تصنيفات القوانين ────────────────────────────────────────────────────────

const CATEGORIES: { id: string; label: string; icon: string; color: string; ids: string[] }[] = [
  {
    id: 'main',
    label: 'القوانين الأساسية',
    icon: '⚖️',
    color: '#1a3a5c',
    ids: ['civil', 'commercial', 'family', 'penal', 'qij', 'qima', 'maritime', 'fiscal'],
  },
  {
    id: 'civil_status',
    label: 'الأحوال الشخصية',
    icon: '👨‍👩‍👧',
    color: '#ec4899',
    ids: [
      'قانون_2_قانون_النفقة',
      'قانون_6_قانون_الحالة_المدني_ة',
      'قانون_7_تغيير_اللقب',
      'قانون_الجنسية',
      'قانون_58_قانون_حماية_الاشخاص_المسنين',
      'قانون_59_قانون_حماية_الطّفْل',
      'قانون_1_شروط_إنشاء_مؤسسات_استقبال_الطف',
    ],
  },
  {
    id: 'penal_special',
    label: 'القانون الجزائي الخاص',
    icon: '🔒',
    color: '#dc2626',
    ids: [
      'قانون_55_قانون_الوقاية_من_الفساد_ومكافح',
      'قانون_99_قانون_الوقاية_من_المخدرات_و_ال',
      'قانون_98_الوقاية_من_جرائم_اختطاف_الأشخا',
      'قانون_الاتجار_بالبشر',
      'قانون_عصابات_الأحياء',
      'قانون_54_قانون_الوقاية_من_التمييز',
      'قانون_23_قانون_تنظيم_السجون_وإعادة_الإد',
      'قانون_52_قانون_القضاء_العسكري',
      'قانون_53_قانون_العتاد_الحربي_و_الأسلحة',
      'قانون_50_قانون_الاعلام',
    ],
  },
  {
    id: 'administrative',
    label: 'القانون الإداري',
    icon: '🏛️',
    color: '#0891b2',
    ids: [
      'قانون_68_قانون_11-10_في_22_يونيو_سنة_20',
      'قانون_67_قانون_رقم_12-07_مؤرخ_في_28_ربي',
      'قانون_87_القانون_الأساسي_العام_للوظيفة',
      'قانون_88_قانون_مفتشية_العمل',
      'قانون_51_قانون_المساعدة_القضائية',
      'قانون_16_حماية_المعلومات_والوثائق_الإدا',
      'قانون_24_شروط_دخول_الأجانب_الى_الجزائر',
      'قانون_69_دستور_الجمهورية_الجزائرية_الدي',
    ],
  },
  {
    id: 'commercial_tax',
    label: 'القانون التجاري والجبائي',
    icon: '💰',
    color: '#16a34a',
    ids: [
      'قانون_3_قانون_0804_يتعلق_بشروط_ممارسة',
      'قانون_4_القواعد_المطبقة_على_الممارسات',
      'قانون_26_قانون_الجمارك',
      'قانون_28_قانون_الرسوم_على_رقم_الأعمال',
      'قانون_29_قانون_الضرائب_غیر_المباشرة',
      'قانون_30_قانون_الاجراءات_الجبائیة',
      'قانون_18_قانون_التسجیل',
      'قانون_74_قانون_الاستثمار_(ق_22-18)',
      'قانون_المنافسة',
      'قانون_73_قانون_مكافحة_المضاربة_غير_المش',
      'قانون_71_​​​​​​​​​​​​_قانون_بورصة_القیم',
      'قانون_72_القانون_06-05_مؤرخ_في_21_محرم',
      'قانون_5_قانون_رقم_18-05_مؤرخ_في_24_شعب',
      'قانون_56_قانون_حماية_المستهلك_و_قمع_الغ',
    ],
  },
  {
    id: 'real_estate',
    label: 'قانون العقار',
    icon: '🏠',
    color: '#b45309',
    ids: [
      'قانون_75_قانون_التوجيه_العقاري',
      'قانون_76_حيـازة_الملكيـة_العقـاريــة_ال',
      'قانون_82_تأسيس_السجل_العقاري',
      'قانون_83_اعداد_مسح_الأراضي_العام_و_تأسي',
      'قانون_84_إعداد_مسح_الأراضي_العام',
      'قانون_81_القواعد_المتعلقة_بنزع_الملكية',
      'قانون_48_قانون_التهيئة_والتعمير',
      'قانون_47_كيفيات_تحضير_عقود_التعمير_و_تس',
      'قانون_79_قواعد_إحداث_وكالات_محلية_للتسي',
      'قانون_80_الوكالة_الوطنية_للوساطة_والضبط',
      'قانون_66_قانون_90-30_مؤرخ_في_14_جمادى_ا',
      'قانون_85_أمر_رقم_76-106_مؤرخ_في_17_ذي_ا',
    ],
  },
  {
    id: 'labor',
    label: 'قانون العمل',
    icon: '👷',
    color: '#7c3aed',
    ids: [
      'قانون_91_القانون_رقم_90_11_المؤرخ_في',
      'قانون_86_قانون_التقاعد',
      'قانون_89_قانون_81-10_یتعلق_بشروط_تشغیل',
      'قانون_90_الحفاظ_على_الشغل_وحماية_الأجرا',
      'قانون_93_قانون_رقم_83-13_يتعلق_بحوادث_ا',
      'قانون_62_القانون_83-14_يتعلق_بالتزامات',
      'قانون_63_القانون_83-11_يتعلق_بالتأمينات',
      'قانون_تسوية_النزاعات_الفردية',
      'قانون_تنصيب_العمال',
      'قانون_92_أمر_رقم_03_-_12_مؤرخ_في_27_جما',
    ],
  },
  {
    id: 'environment',
    label: 'البيئة والفلاحة',
    icon: '🌿',
    color: '#15803d',
    ids: [
      'قانون_60_قانون_حماية_البيئة_في_اطار_الت',
      'قانون_32_قانون_تسيير_النفايات_ومراقبتها',
      'قانون_31_تسيير_المساحات_الخضراء_وحمايته',
      'قانون_45_حماية_الساحل_وتثمينه',
      'قانون_44_النظام_العام_للغابا_ت',
      'قانون_42_قانون_التوجيه_الفلاحي',
      'قانون_40_قانون_يحدد_شروط_و_كيفيات_استغل',
      'قانون_39_قانون_حماية_الصحة_النباتية',
      'قانون_38_قانون_نشاطات_الطب_البيطري_وحما',
      'قانون_37_حماية_بعض_الانواع_الحيوانية_ال',
      'قانون_41_القواعد_التي_تطبق_على_التعاوني',
      'قانون_43_كيفيات_تنظيم_وتنسيق_الأعمال_ال',
    ],
  },
  {
    id: 'transport',
    label: 'النقل والمرور',
    icon: '🚗',
    color: '#0369a1',
    ids: [
      'قانون_المرور',
      'قانون_96_قواعد_حركة_المرور_عبر_الطرق',
      'قانون_97_قانون_14-01_المتعلق_بتنظیم_حرك',
      'قانون_95_قانون_یتضمن_توجیه_النقل_البري',
      'قانون_94_أمر_رقم_74-15_مؤرخ_في_6_محرم_ع',
    ],
  },
  {
    id: 'health_social',
    label: 'الصحة والضمان الاجتماعي',
    icon: '🏥',
    color: '#0f766e',
    ids: [
      'قانون_61_قانون_الصحة',
      'قانون_64_قانون_التأمينا_ت',
      'قانون_57_قانون_رقم_25-01_مؤرخ_في_21_شع',
      'قانون_17_قانون_الوقاية_من_الاخطار_الكبر',
      'قانون_8_القانون08-08',
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCategoryForLaw(id: string): { label: string; icon: string; color: string } | null {
  for (const cat of CATEGORIES) {
    if (cat.ids.includes(id)) return { label: cat.label, icon: cat.icon, color: cat.color };
  }
  return null;
}

// ─── HighlightedText ──────────────────────────────────────────────────────────

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-amber-300/70 dark:bg-amber-500/50 text-amber-900 dark:text-amber-100 rounded px-0.5 font-black not-italic"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ totalLaws, totalArticles }: { totalLaws: number; totalArticles: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'قانون', value: totalLaws, icon: '📚', color: '#1a3a5c' },
        { label: 'مادة قانونية', value: totalArticles.toLocaleString('ar-DZ'), icon: '📋', color: '#16a34a' },
        { label: 'تصنيف', value: CATEGORIES.length, icon: '🗂️', color: '#7c3aed' },
        { label: 'بحث فوري', value: '✓', icon: '⚡', color: '#dc2626' },
      ].map((s, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800/60 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm flex items-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: hexToRgba(s.color, 0.12) }}
          >
            {s.icon}
          </div>
          <div>
            <p className="font-black text-lg text-gray-800 dark:text-gray-100 leading-none">{s.value}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Category Filter ──────────────────────────────────────────────────────────

function CategoryFilter({
  activeCategory,
  onChange,
  lawsMeta,
}: {
  activeCategory: string;
  onChange: (id: string) => void;
  lawsMeta: LawMeta[];
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
      <button
        onClick={() => onChange('all')}
        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
          activeCategory === 'all'
            ? 'bg-[#1a3a5c] text-white shadow-md'
            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
        }`}
      >
        <span>🗂️</span>
        <span>الكل ({lawsMeta.length})</span>
      </button>
      {CATEGORIES.map((cat) => {
        const count = cat.ids.filter((id) => lawsMeta.find((l) => l.id === id)).length;
        if (count === 0) return null;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
              activeCategory === cat.id
                ? 'text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
            }`}
            style={activeCategory === cat.id ? { backgroundColor: cat.color } : {}}
          >
            <span>{cat.icon}</span>
            <span>
              {cat.label} ({count})
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Law Grid Card ────────────────────────────────────────────────────────────

function LawGridCard({ law, onClick }: { law: LawMeta; onClick: () => void }) {
  const cat = getCategoryForLaw(law.id);
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-500 transition-all shadow-sm hover:shadow-lg cursor-pointer group relative overflow-hidden"
    >
      {/* top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl opacity-80"
        style={{ backgroundColor: law.color }}
      />
      <div className="flex items-start gap-3 pt-1">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0"
          style={{ backgroundColor: hexToRgba(law.color, 0.13) }}
        >
          {law.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-gray-800 dark:text-gray-100 text-sm leading-snug line-clamp-2">
            {law.name}
          </h4>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {law.number && (
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: law.color }}
              >
                {law.number}
              </span>
            )}
            <span className="text-[10px] text-gray-400 font-bold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {law.count} مادة
            </span>
            {cat && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: hexToRgba(cat.color, 0.1), color: cat.color }}
              >
                {cat.icon} {cat.label}
              </span>
            )}
          </div>
        </div>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white text-sm font-black flex-shrink-0 shadow-md"
          style={{ backgroundColor: law.color }}
        >
          ←
        </div>
      </div>
    </motion.div>
  );
}

// ─── Article Card (Full Text) ─────────────────────────────────────────────────

function ArticleCard({
  article,
  lawMeta,
  onCopy,
  onWhatsApp,
  copiedId,
  highlightQuery,
  isSearchResult,
}: {
  article: LawArticle;
  lawMeta: LawMeta;
  onCopy: () => void;
  onWhatsApp: () => void;
  copiedId: string | null;
  highlightQuery?: string;
  isSearchResult?: boolean;
}) {
  const id = `${lawMeta.id}-${article.num}`;
  const isMatched = highlightQuery && article.text.toLowerCase().includes(highlightQuery.toLowerCase());

  return (
    <div
      id={`article-${article.num}`}
      className={`rounded-2xl border transition-colors group relative overflow-hidden ${
        isSearchResult && isMatched
          ? 'border-amber-300 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-900/10 shadow-md'
          : 'border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {/* Left accent */}
      <div
        className="absolute top-0 right-0 w-1 h-full"
        style={{ backgroundColor: isSearchResult && isMatched ? '#f59e0b' : hexToRgba(lawMeta.color, 0.7) }}
      />

      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black text-white shadow-sm"
              style={{ backgroundColor: isSearchResult && isMatched ? '#f59e0b' : lawMeta.color }}
            >
              المادة {article.number || article.num}
            </span>
            {isSearchResult && isMatched && (
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-lg">
                ✓ نتيجة البحث
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                copiedId === id
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {copiedId === id ? (
                <>✅ تم النسخ</>
              ) : (
                <>📋 نسخ</>
              )}
            </button>
            <button
              onClick={onWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-all"
            >
              📲 واتساب
            </button>
          </div>
        </div>

        {/* Article full text */}
        <div className="bg-gray-50/60 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100/60 dark:border-gray-800/60">
          <p className="text-gray-700 dark:text-gray-200 leading-loose text-sm sm:text-base whitespace-pre-line font-medium">
            {highlightQuery ? (
              <HighlightedText text={article.text} query={highlightQuery} />
            ) : (
              article.text
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Individual Law View (PDF-Like) ──────────────────────────────────────────

function IndividualLawView({ law, onBack }: { law: LawMeta; onBack: () => void }) {
  const [articles, setArticles] = useState<LawArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [jumpInput, setJumpInput] = useState('');

  // ── مهم: scroll للأعلى فور فتح القانون
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setArticles([]);
    fetch(`/laws-json/${law.file}`)
      .then((r) => r.json())
      .then((data: LawArticle[]) => {
        if (!cancelled) {
          setArticles(data);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [law.file]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [searchQuery]);

  const filteredArticles = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return articles;
    const nums = q.match(/\d+/g);
    const words = q.replace(/\d+/g, ' ').trim().split(/\s+/).filter((w) => w.length > 0);
    return articles.filter((a) => {
      const txt = a.text.toLowerCase();
      const artNum = String(a.num);
      const artNumber = String(a.number || a.num);
      if (txt.includes(q) || artNum === q) return true;
      if (nums && nums.length > 0) {
        const numMatch = nums.some((n) => artNum === n || artNumber === n);
        if (numMatch && words.length === 0) return true;
        if (numMatch && words.every((w) => txt.includes(w))) return true;
      }
      if (words.length > 0) return words.every((w) => txt.includes(w));
      return false;
    });
  }, [articles, debouncedQuery]);

  const handleCopy = useCallback(
    (article: LawArticle) => {
      const text = `${law.icon} ${law.name}\nالمادة ${article.number || article.num}\n\n${article.text}`;
      navigator.clipboard.writeText(text);
      const id = `${law.id}-${article.num}`;
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    },
    [law]
  );

  const handleWhatsApp = useCallback(
    (article: LawArticle) => {
      const text = `*${law.icon} ${law.name}*\n*المادة ${article.number || article.num}*\n\n${article.text}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    },
    [law]
  );

  const handleJump = () => {
    const n = parseInt(jumpInput);
    if (!n) return;
    // البحث عن المادة بـ num أو number
    const target = articles.find((a) => a.num === n || String(a.number) === String(n));
    const el = target
      ? document.getElementById(`article-${target.num}`)
      : document.getElementById(`article-${n}`);
    if (el) {
      const navbarOffset = 130;
      const top = el.getBoundingClientRect().top + window.scrollY - navbarOffset;
      window.scrollTo({ top, behavior: 'smooth' });
      el.style.outline = '3px solid #f59e0b';
      el.style.outlineOffset = '4px';
      el.style.borderRadius = '16px';
      setTimeout(() => {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }, 2500);
    }
    setJumpInput('');
  };

  const cat = getCategoryForLaw(law.id);
  const matchCount = debouncedQuery ? filteredArticles.length : 0;

  return (
    <div ref={topRef}>
      {/* Back + Header */}
      <div className="mb-6 space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-black text-gray-600 dark:text-gray-300 transition-all group"
        >
          <span className="group-hover:translate-x-1 transition-transform">→</span>
          <span>العودة إلى قائمة القوانين</span>
        </button>

        {/* Law Banner */}
        <div
          className="relative rounded-3xl p-6 sm:p-8 text-white overflow-hidden shadow-xl"
          style={{ background: `linear-gradient(135deg, ${law.color}, ${hexToRgba(law.color, 0.65)})` }}
        >
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-white/5 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl shadow-inner flex-shrink-0">
                {law.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-xl sm:text-3xl leading-tight">{law.name}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {law.number && (
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-black">
                      رقم {law.number}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-black">
                    {law.count} مادة
                  </span>
                  {cat && (
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-black">
                      {cat.icon} {cat.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Jump */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`ابحث في ${law.name}... (كلمة، عبارة، أو رقم المادة)`}
            className="w-full p-4 pr-12 rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-[#1a3a5c] dark:focus:border-[#f0c040] outline-none transition-all shadow-sm text-sm font-bold"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl font-black"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJump()}
            placeholder="انتقل لمادة رقم..."
            className="flex-1 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-amber-400 outline-none transition-all shadow-sm text-sm font-bold text-center"
          />
          <button
            onClick={handleJump}
            className="px-4 py-2 rounded-2xl bg-amber-400 hover:bg-amber-500 text-white font-black text-sm shadow-sm transition-all"
          >
            ←
          </button>
        </div>
      </div>

      {/* Results info banner */}
      {debouncedQuery && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700"
        >
          <span className="text-2xl">🔍</span>
          <div>
            <p className="font-black text-amber-800 dark:text-amber-300 text-sm">
              {matchCount > 0 ? (
                <>تم العثور على <span className="text-xl">{matchCount}</span> مادة تتضمن &quot;{debouncedQuery}&quot;</>
              ) : (
                <>لا توجد نتائج لـ &quot;{debouncedQuery}&quot; في هذا القانون</>
              )}
            </p>
          </div>
          {matchCount > 0 && (
            <span className="mr-auto px-3 py-1 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full text-xs font-black">
              مُمَيَّزة بالأصفر
            </span>
          )}
        </motion.div>
      )}

      {/* Articles */}
      {isLoading ? (
        <div className="text-center py-20">
          <div
            className="text-5xl mb-4 animate-bounce inline-block"
          >
            {law.icon}
          </div>
          <p className="text-gray-500 font-black text-lg">جاري تحميل القانون كاملاً...</p>
          <p className="text-gray-400 text-sm mt-1">{law.count} مادة</p>
        </div>
      ) : (
        <>
          {/* Article count header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-700 dark:text-gray-200 text-sm">
              {debouncedQuery
                ? `${filteredArticles.length} مادة مطابقة`
                : `جميع المواد — ${articles.length} مادة`}
            </h3>
            <button
              onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              ↑ الأعلى
            </button>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-gray-500 font-black">لم يُعثر على نتائج لـ &quot;{debouncedQuery}&quot;</p>
              <button onClick={() => setSearchQuery('')} className="mt-3 text-sm text-[#1a3a5c] dark:text-[#f0c040] font-black underline">
                مسح البحث
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.num}
                  article={article}
                  lawMeta={law}
                  onCopy={() => handleCopy(article)}
                  onWhatsApp={() => handleWhatsApp(article)}
                  copiedId={copiedId}
                  highlightQuery={debouncedQuery || undefined}
                  isSearchResult={!!debouncedQuery}
                />
              ))}
            </div>
          )}

          {/* Back to top floater */}
          <div className="sticky bottom-6 flex justify-center mt-8 pointer-events-none">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="pointer-events-auto px-5 py-2.5 rounded-2xl bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-gray-900 font-black text-sm shadow-xl hover:shadow-2xl transition-all opacity-80 hover:opacity-100"
            >
              ↑ العودة للأعلى
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Global Search Results ────────────────────────────────────────────────────

function GlobalSearchResults({
  results,
  lawsMeta,
  query,
  onSelectLaw,
}: {
  results: ScoredArticle[];
  lawsMeta: LawMeta[];
  query: string;
  onSelectLaw: (law: LawMeta) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? results : results.slice(0, 30);

  const handleCopy = (article: ScoredArticle) => {
    const meta = lawsMeta.find((l) => l.id === article.law);
    const text = `${meta?.icon || '⚖️'} ${meta?.name || article.law}\nالمادة ${article.num}\n\n${article.text}`;
    navigator.clipboard.writeText(text);
    setCopiedId(`${article.law}-${article.num}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsApp = (article: ScoredArticle) => {
    const meta = lawsMeta.find((l) => l.id === article.law);
    const text = `*${meta?.icon || '⚖️'} ${meta?.name || article.law}*\n*المادة ${article.num}*\n\n${article.text}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Group by law
  const grouped = useMemo(() => {
    const map = new Map<string, ScoredArticle[]>();
    for (const r of visible) {
      if (!map.has(r.law)) map.set(r.law, []);
      map.get(r.law)!.push(r);
    }
    return map;
  }, [visible]);

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          <div>
            <h3 className="font-black text-[#1a3a5c] dark:text-[#f0c040] text-lg">
              نتائج البحث الشامل
            </h3>
            <p className="text-gray-400 text-xs">
              {results.length} نتيجة في {grouped.size} قانون لـ &quot;{query}&quot;
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {results.length > 30 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="px-4 py-2 rounded-xl bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-gray-900 text-xs font-black shadow-sm"
            >
              {showAll ? 'عرض أقل' : `عرض الكل (${results.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Grouped results */}
      {Array.from(grouped.entries()).map(([lawId, articles]) => {
        const meta = lawsMeta.find((l) => l.id === lawId);
        const lawColor = meta?.color || '#2563eb';
        return (
          <div key={lawId} className="space-y-2">
            {/* Law name header */}
            <button
              onClick={() => meta && onSelectLaw(meta)}
              className="flex items-center gap-3 w-full text-right hover:opacity-80 transition-opacity"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm flex-shrink-0"
                style={{ backgroundColor: hexToRgba(lawColor, 0.15) }}
              >
                {meta?.icon || '⚖️'}
              </div>
              <span className="font-black text-sm" style={{ color: lawColor }}>
                {meta?.name || lawId}
              </span>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full mr-auto">
                {articles.length} مادة
              </span>
              <span className="text-gray-400 text-xs">فتح القانون →</span>
            </button>

            {articles.map((article) => {
              const lawMeta: LawMeta = meta || {
                id: article.law,
                name: article.law,
                file: '',
                count: 0,
                number: '',
                icon: '⚖️',
                color: '#2563eb',
              };
              const id = `${article.law}-${article.num}`;
              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800/40 rounded-2xl border border-amber-200/60 dark:border-amber-700/40 shadow-sm p-4 sm:p-5 relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 right-0 w-1 h-full"
                    style={{ backgroundColor: lawMeta.color }}
                  />
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-black text-white"
                      style={{ backgroundColor: lawMeta.color }}
                    >
                      المادة {article.number || article.num}
                    </span>
                    <div className="flex gap-2 mr-auto">
                      <button
                        onClick={() => handleCopy(article)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          copiedId === id
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-900 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {copiedId === id ? '✅ تم النسخ' : '📋 نسخ'}
                      </button>
                      <button
                        onClick={() => handleWhatsApp(article)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold hover:bg-green-100 transition-all"
                      >
                        📲 واتساب
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50/60 dark:bg-gray-900/40 p-4 rounded-xl">
                    <p className="text-gray-700 dark:text-gray-200 leading-loose text-sm whitespace-pre-line font-medium">
                      <HighlightedText text={article.text} query={query} />
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GlobalLawSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [lawsMeta, setLawsMeta] = useState<LawMeta[]>([]);
  const [allArticles, setAllArticles] = useState<LawArticleWithLaw[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [results, setResults] = useState<ScoredArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLaw, setSelectedLaw] = useState<LawMeta | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [gridSearch, setGridSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [totalArticles, setTotalArticles] = useState(0);

  // Load metadata
  useEffect(() => {
    fetch('/laws-json/index.json')
      .then((r) => r.json())
      .then((data: LawMeta[]) => setLawsMeta(data))
      .catch(() => {});
  }, []);

  // Load all articles for global search
  useEffect(() => {
    let cancelled = false;
    fetch('/laws-json/all.json')
      .then((r) => r.json())
      .then((data: LawArticleWithLaw[]) => {
        if (!cancelled) {
          setAllArticles(data);
          setTotalArticles(data.length);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoadingData(false); });
    return () => { cancelled = true; };
  }, []);

  // Debounce query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  // Global search
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) { setResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const raf = requestAnimationFrame(() => {
      const scored: ScoredArticle[] = [];
      const ql = q.toLowerCase();
      const nums = ql.match(/\d+/g);
      const words = ql.replace(/\d+/g, ' ').trim().split(/\s+/).filter((w) => w.length > 0);
      for (const a of allArticles) {
        const tl = a.text.toLowerCase();
        const an = String(a.num);
        let score = 0;
        if (tl === ql) score = 100;
        else if (tl.startsWith(ql)) score = 80;
        else if (tl.includes(ql)) score = 50;
        else {
          const nm = nums && nums.some((n) => an === n || an.includes(n));
          const wm = words.length > 0 && words.every((w) => tl.includes(w));
          if (nm && words.length === 0) score = 70;
          else if (nm && wm) score = 65;
          else if (wm) score = (words.length / Math.max(ql.split(/\s+/).length, 1)) * 45;
        }
        if (score > 0) scored.push({ ...a, _score: score });
      }
      scored.sort((a, b) => b._score - a._score);
      setResults(scored.slice(0, 200));
      setIsSearching(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [debouncedQuery, allArticles]);

  // Filtered laws for grid
  const filteredLaws = useMemo(() => {
    let list = lawsMeta;
    if (activeCategory !== 'all') {
      const cat = CATEGORIES.find((c) => c.id === activeCategory);
      if (cat) list = list.filter((l) => cat.ids.includes(l.id));
    }
    if (gridSearch.trim()) {
      const gs = gridSearch.trim().toLowerCase();
      list = list.filter(
        (l) => l.name.toLowerCase().includes(gs) || l.number?.toLowerCase().includes(gs)
      );
    }
    return list;
  }, [lawsMeta, activeCategory, gridSearch]);

  // ─── Individual Law View
  if (selectedLaw) {
    return (
      <div dir="rtl">
        <IndividualLawView law={selectedLaw} onBack={() => { setSelectedLaw(null); window.scrollTo({ top: 0, behavior: 'instant' }); }} />
      </div>
    );
  }

  // ─── Main View
  return (
    <div className="space-y-6" dir="rtl">
      {/* Stats */}
      {!isLoadingData && (
        <StatsBar totalLaws={lawsMeta.length} totalArticles={totalArticles} />
      )}

      {/* Global Search */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`🔍  ابحث في ${lawsMeta.length} قانوناً جزائرياً دفعة واحدة... (كلمة، عبارة، أو رقم المادة)`}
          className="w-full p-4 sm:p-5 pr-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-[#1a3a5c] dark:focus:border-[#f0c040] outline-none transition-all shadow-sm text-sm sm:text-base font-bold"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-black transition-all"
          >
            ×
          </button>
        )}
      </div>

      {/* Search Results or Grid */}
      <AnimatePresence mode="wait">
        {isSearching ? (
          <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="text-5xl mb-4 animate-spin">⚖️</div>
            <p className="text-gray-500 font-black text-lg">جاري البحث في {totalArticles.toLocaleString('ar-DZ')} مادة قانونية...</p>
          </motion.div>
        ) : results.length > 0 ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlobalSearchResults
              results={results}
              lawsMeta={lawsMeta}
              query={debouncedQuery}
              onSelectLaw={setSelectedLaw}
            />
          </motion.div>
        ) : debouncedQuery ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700"
          >
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500 font-black">لم يُعثر على نتائج لـ &quot;{debouncedQuery}&quot;</p>
            <p className="text-gray-400 text-sm mt-1">جرّب كلمات مختلفة أو تحقق من الإملاء</p>
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* Grid search + category filter */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={gridSearch}
                  onChange={(e) => setGridSearch(e.target.value)}
                  placeholder="ابحث في أسماء القوانين..."
                  className="w-full p-3.5 pr-10 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-[#1a3a5c] dark:focus:border-[#f0c040] outline-none transition-all text-sm font-bold"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">🗂️</span>
                {gridSearch && (
                  <button
                    onClick={() => setGridSearch('')}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl font-black"
                  >
                    ×
                  </button>
                )}
              </div>
              <CategoryFilter
                activeCategory={activeCategory}
                onChange={setActiveCategory}
                lawsMeta={lawsMeta}
              />
            </div>

            {/* Laws count */}
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-600 dark:text-gray-300 text-sm">
                {activeCategory === 'all' && !gridSearch
                  ? `جميع القوانين — ${lawsMeta.length} قانون`
                  : `${filteredLaws.length} قانون`}
              </h3>
              {(activeCategory !== 'all' || gridSearch) && (
                <button
                  onClick={() => { setActiveCategory('all'); setGridSearch(''); }}
                  className="text-xs font-bold text-[#1a3a5c] dark:text-[#f0c040] hover:underline"
                >
                  مسح الفلتر
                </button>
              )}
            </div>

            {/* Grid */}
            {isLoadingData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredLaws.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 font-black">لا توجد قوانين في هذا التصنيف</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredLaws.map((law) => (
                  <LawGridCard key={law.id} law={law} onClick={() => setSelectedLaw(law)} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
