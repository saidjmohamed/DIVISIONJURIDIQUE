'use client';

import { useMemo, useState } from 'react';
import { Search, Copy, Check, ChevronDown, FileText, ShieldCheck, ArrowRight } from 'lucide-react';
import {
  LEGAL_MEMO_PROMPTS,
  LEGAL_PROMPT_CATEGORIES,
  buildLegalMemoPrompt,
  type LegalMemoPrompt,
} from '@/data/legal-memo-prompts';

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase('ar')
    .normalize('NFD')
    .replace(/[\\u064B-\\u065F\\u0670\\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

export default function LegalMemoPrompts({ onBack }: { onBack?: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('الكل');
  const [sourceMatch, setSourceMatch] = useState('الكل');
  const [selectedId, setSelectedId] = useState(LEGAL_MEMO_PROMPTS[0]?.id ?? '');
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeSearchText(query.trim());
    return LEGAL_MEMO_PROMPTS.filter((item) => {
      const matchesCategory = category === 'الكل' || item.category === category;
      const matchesSource = sourceMatch === 'الكل' || (item.sourceMatchStatus ?? 'not-verified') === sourceMatch;
      const haystack = normalizeSearchText([
        item.id, item.title, item.category, item.sourcePart, item.sourceHeading, item.objective,
        ...item.structure, ...item.requiredInputs, ...item.specialRules, ...item.checklist,
      ].join(' '));
      return matchesCategory && matchesSource && (!q || haystack.includes(q));
    });
  }, [query, category, sourceMatch]);

  const selected: LegalMemoPrompt | undefined =
    filtered.find((item) => item.id === selectedId) ?? filtered[0];

  const prompt = selected ? buildLegalMemoPrompt(selected) : '';

  async function copyPrompt() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      window.alert('تعذر النسخ التلقائي. حدّد نص البرومبت وانسخه يدويًا.');
    }
  }

  return (
    <section dir="rtl" className="mx-auto max-w-5xl px-2 sm:px-4">
      <div className="mb-5 flex items-center gap-3">
        {onBack && (
          <button type="button" onClick={onBack} className="rounded-xl border border-gray-200 dark:border-gray-700 p-2 hover:bg-gray-50 dark:hover:bg-gray-800" aria-label="العودة إلى أدوات المحامي">
            <ArrowRight size={18} />
          </button>
        )}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a3a5c] text-white dark:bg-[#f0c040] dark:text-[#1a3a5c]">
          <FileText size={24} />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-[#1a3a5c] dark:text-[#f0c040]">نماذج عرائض الذكاء الاصطناعي</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">مكتبة عرائض جزائرية موسعة مستندة إلى فهرس الكتاب، مع أسئلة توضيحية وتحقق قانوني</p>
          <p className="mt-1 text-xs font-semibold text-[#1a3a5c] dark:text-[#f0c040]">
            {LEGAL_MEMO_PROMPTS.length.toLocaleString("ar-DZ")} نموذجًا في المكتبة — {LEGAL_MEMO_PROMPTS.filter((item) => item.id.startsWith("book-template-")).length.toLocaleString("ar-DZ")} نموذجًا مفهرسًا من كتاب حسين بوشينة ونبيل صقر
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
        <div className="flex items-start gap-2">
          <FileText size={19} className="mt-1 shrink-0" />
          <div>
            <p className="font-bold">آلية العمل قبل تحرير أي مذكرة</p>
            <ol className="mt-1 list-inside list-decimal space-y-1">
              <li>أرفق ملف القضية مع البرومبت المنسوخ.</li>
              <li>يقرأ النموذج الملف أولًا ويستخرج المعلومات الموجودة فيه.</li>
              <li>يطرح أسئلة توضيحية مخصصة للقضية، ويتجنب تكرار المعلومات الواضحة في الملف.</li>
              <li>ينتظر إجاباتك عن المسائل الجوهرية، ثم يطرح أسئلة متابعة إذا بقي نقص مؤثر.</li>
              <li>بعد اكتمال الإجابات، يصوغ المذكرة ويقدم تقرير تحقق منفصلًا.</li>
            </ol>
            <p className="mt-2 text-xs">يمكنك الإجابة جزئيًا أو قول «لا أعلم»؛ ولا يجوز للنموذج افتراض الوقائع الناقصة.</p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <ShieldCheck size={19} className="mt-1 shrink-0" />
          <p>كل برومبت يفرض التحقق من النصوص الجزائرية والاجتهادات القضائية، ويُلزم النموذج بالتصريح عند تعذر العثور على مصدر. يجب على المحامي مراجعة المسودة وتقرير التحقق قبل اعتماد أي وثيقة.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.5fr)]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
          <label htmlFor="memo-prompt-search" className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-200">البحث في النماذج</label>
          <div className="relative mb-3">
            <Search size={17} className="absolute right-3 top-3 text-gray-400" />
            <input
              id="memo-prompt-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث في العنوان والتصنيف والبيانات والقواعد..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-9 pl-3 text-sm outline-none focus:border-[#1a3a5c] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <label htmlFor="memo-prompt-category" className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-200">التصنيف</label>
          <div className="relative mb-3">
            <select
              id="memo-prompt-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pr-3 pl-9 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="الكل">كل التصنيفات</option>
              {LEGAL_PROMPT_CATEGORIES.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute left-3 top-3 text-gray-400" />
          </div>

          <label htmlFor="memo-prompt-source" className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-200">حالة المطابقة مع الكتاب</label>
          <select
            id="memo-prompt-source"
            value={sourceMatch}
            onChange={(event) => setSourceMatch(event.target.value)}
            className="mb-3 w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="الكل">كل حالات المطابقة</option>
            <option value="toc-matched">مطابق مع الفهرس</option>
            <option value="needs-review">يحتاج تدقيقًا</option>
            <option value="not-verified">غير متحقق من المصدر</option>
          </select>

          <label htmlFor="memo-prompt-select" className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-200">قائمة منسدلة بالنماذج</label>
          <select
            id="memo-prompt-select"
            value={selected?.id ?? ''}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm leading-6 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {filtered.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {filtered.length} نموذج مطابق للبحث
          </div>

          {filtered.length === 0 && (
            <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800">لا توجد نماذج مطابقة. جرّب كلمة بحث أخرى.</p>
          )}
        </aside>

        <div className="min-w-0 space-y-4">
          {selected ? (
            <>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="mb-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">{selected.category}</span>
                    <h3 className="text-lg font-black leading-7 text-gray-900 dark:text-white">{selected.title}</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">مرجع المنهجية: {selected.sourcePart} — {selected.sourceHeading}</p>
                    <p className={`mt-1 text-xs font-semibold ${selected.sourceMatchStatus === 'toc-matched' ? 'text-emerald-700 dark:text-emerald-300' : selected.sourceMatchStatus === 'needs-review' ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      مطابقة الفهرس: {selected.sourceMatchStatus === 'toc-matched'
                        ? 'تمت مطابقة العنوان والصفحة مع الفهرس؛ لا يعني ذلك مطابقة حرفية للمتن'
                        : selected.sourceMatchStatus === 'needs-review'
                          ? 'مطابقة المتن أو الإحالة تحتاج إلى استكمال'
                          : 'لم تثبت مطابقة هذا النموذج للكتاب'}
                    </p>
                    <p className={`mt-1 text-xs ${selected.sourceReviewStatus === 'content-reviewed' ? 'text-gray-600 dark:text-gray-300' : 'text-amber-700 dark:text-amber-300'}`}>
                      مراجعة المحتوى: {selected.sourceReviewStatus === 'content-reviewed'
                        ? 'مراجعة أولية لمقاطع من المحتوى؛ النصوص القانونية تحتاج تحققًا مستقلًا'
                        : selected.sourceReviewStatus === 'needs-review'
                          ? 'المتن يحتاج تدقيقًا إضافيًا قبل الاعتماد'
                          : 'لم تتم مراجعة هذا النموذج مقابل الكتاب'}
                    </p>
                  </div>
                  <button type="button" onClick={copyPrompt} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1a3a5c] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 dark:bg-[#f0c040] dark:text-[#1a3a5c]">
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                    {copied ? 'تم النسخ' : 'نسخ البرومبت الكامل'}
                  </button>
                </div>

                <p className="text-sm leading-7 text-gray-700 dark:text-gray-300">{selected.objective}</p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                    <h4 className="mb-2 text-sm font-bold">البيانات التي سيطلبها</h4>
                    <ul className="list-inside list-disc space-y-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {selected.requiredInputs.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                    <h4 className="mb-2 text-sm font-bold">قائمة المراجعة</h4>
                    <ul className="list-inside list-disc space-y-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {selected.checklist.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white">البرومبت الجاهز للنسخ</h3>
                  <span className="text-xs text-gray-500">{prompt.length.toLocaleString('ar-DZ')} حرف</span>
                </div>
                <textarea
                  readOnly
                  value={prompt}
                  rows={15}
                  className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-7 text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                  aria-label="نص البرومبت الكامل"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">البرومبت يفرض قراءة ملف القضية وطرح أسئلة توضيحية وانتظار الإجابات قبل الصياغة، ثم إنتاج المذكرة وتقرير التحقق بشكل منفصل.</p>
                  <button type="button" onClick={copyPrompt} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'تم النسخ' : 'نسخ النص'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700">اختر نموذجًا من القائمة لعرض برومبته.</div>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-xs leading-6 text-gray-500 dark:text-gray-400">
        هذه المكتبة أداة مساعدة للصياغة والبحث. لا تعتمد أي مذكرة قبل مراجعة المحامي للنصوص والمراجع والوقائع والطلبات.
      </p>
    </section>
  );
}
