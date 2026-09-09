'use client';

import { useState } from 'react';

interface Props { onBack: () => void }

export default function ReversePromptBuilder({ onBack }: Props) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function analyze() {
    if (!text.trim()) return setError('يرجى إدخال نص المذكرة أو تحميل ملف نصي.');
    setLoading(true); setError(''); setResult('');
    try {
      const res = await fetch('/api/tools/reverse-prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر تحليل المذكرة.');
      setResult(data.prompt || '');
    } catch (e) { setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع.'); }
    finally { setLoading(false); }
  }

  async function readFile(file: File) {
    setFileName(file.name); setError('');
    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      setText(await file.text()); return;
    }
    setError('في هذه النسخة يمكن إدخال النص مباشرة أو تحميل TXT. لتحليل PDF/DOCX استخدم OCR أو حوّل الملف إلى نص أولاً.');
  }

  async function copy() {
    if (result) await navigator.clipboard.writeText(result);
  }

  return <div className="max-w-4xl mx-auto px-3 sm:px-4" dir="rtl">
    <button onClick={onBack} className="mb-5 text-sm text-[#1a3a5c] dark:text-gray-300">← العودة إلى أدوات المحامي</button>
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 sm:p-7">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🧩</div>
        <h2 className="text-2xl font-black text-[#1a3a5c] dark:text-[#f0c040]">برومبت وصف عكسي لأي مذكرة</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">استخرج وصفاً دقيقاً للبنية والشكل والأسلوب والصياغة دون كشف موضوع القضية أو الأطراف.</p>
      </div>
      <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs leading-6 text-amber-900 dark:text-amber-200">
        يحلل النظام الأسلوب والبنية فقط، ويُطلب منه تعميم أو إخفاء أسماء الأطراف والوقائع والأرقام والموضوع الخاص بالقضية.
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="ألصق هنا نص المذكرة أو العريضة..." className="w-full min-h-[280px] rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-4 text-sm leading-7 outline-none focus:ring-2 focus:ring-[#1a3a5c]" />
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <label className="cursor-pointer px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-bold">
          📄 تحميل TXT
          <input type="file" accept=".txt,text/plain" className="hidden" onChange={e => e.target.files?.[0] && readFile(e.target.files[0])} />
        </label>
        {fileName && <span className="text-xs text-gray-500">{fileName}</span>}
        <button onClick={analyze} disabled={loading || !text.trim()} className="mr-auto px-5 py-2 rounded-lg bg-[#1a3a5c] text-white text-sm font-bold disabled:opacity-50">{loading ? 'جاري التحليل...' : 'استخراج الوصف العكسي'}</button>
      </div>
      {error && <div className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{error}</div>}
      {result && <div className="mt-6">
        <div className="flex items-center justify-between mb-2"><h3 className="font-black text-[#1a3a5c] dark:text-white">البرومبت الناتج</h3><button onClick={copy} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-bold">📋 نسخ البرومبت</button></div>
        <textarea value={result} onChange={e => setResult(e.target.value)} className="w-full min-h-[420px] rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-4 text-sm leading-7" />
        <p className="mt-2 text-xs text-gray-500">راجع البرومبت الناتج قبل استخدامه في وثيقة قانونية جديدة.</p>
      </div>}
    </div>
  </div>;
}
