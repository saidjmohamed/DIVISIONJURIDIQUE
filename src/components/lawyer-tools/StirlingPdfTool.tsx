'use client';

import { useEffect, useState } from 'react';

type Operation = 'merge' | 'split' | 'compress' | 'ocr';

const operations: Array<{
  id: Operation;
  title: string;
  icon: string;
  description: string;
}> = [
  { id: 'merge', title: 'دمج PDF', icon: '🧩', description: 'جمع عدة ملفات PDF في ملف واحد بالترتيب الذي تختاره.' },
  { id: 'split', title: 'تقسيم PDF', icon: '✂️', description: 'تقسيم ملف PDF ابتداءً من الصفحات التي تحددها.' },
  { id: 'compress', title: 'ضغط PDF', icon: '📦', description: 'تقليل حجم الملف مع التحكم في مستوى الضغط.' },
  { id: 'ocr', title: 'OCR عربي', icon: '🔤', description: 'إضافة طبقة نص قابلة للبحث إلى PDF المصوّر باللغة العربية.' },
];

export default function StirlingPdfTool({ onBack }: { onBack?: () => void }) {
  const [operation, setOperation] = useState<Operation>('merge');
  const [files, setFiles] = useState<File[]>([]);
  const [pageNumbers, setPageNumbers] = useState('');
  const [compression, setCompression] = useState('5');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/tools/stirling-pdf')
      .then(r => r.json())
      .then(data => setConfigured(Boolean(data.configured && data.ok)))
      .catch(() => setConfigured(false));
  }, []);

  const chooseOperation = (next: Operation) => {
    setOperation(next);
    setFiles([]);
    setStatus('');
  };

  const process = async () => {
    if (!files.length) {
      setStatus('يرجى اختيار ملف PDF أولاً.');
      return;
    }

    if (operation === 'merge' && files.length < 2) {
      setStatus('لدمج الملفات اختر ملفين PDF على الأقل.');
      return;
    }

    if (operation === 'split' && !pageNumbers.trim()) {
      setStatus('أدخل أرقام الصفحات، مثل: 3 أو 2,5,8.');
      return;
    }

    setBusy(true);
    setStatus('جارٍ معالجة الملف…');

    try {
      const body = new FormData();
      body.append('operation', operation);
      files.forEach(file => body.append('files', file));
      if (operation === 'split') body.append('pageNumbers', pageNumbers);
      if (operation === 'compress') body.append('optimizeLevel', compression);

      const response = await fetch('/api/tools/stirling-pdf', {
        method: 'POST',
        body,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'فشلت معالجة PDF.');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || `lawyer-tools-${operation}.pdf`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setStatus('✓ تمت معالجة الملف بنجاح، وتم بدء التحميل.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-5" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          ← العودة
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-black text-[#1a3a5c] dark:text-[#f0c040]">🛠️ أدوات PDF للمحامي</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            معالجة PDF عبر Stirling-PDF
          </p>
        </div>
      </div>

      {configured === false && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-200">
          <strong>الخدمة غير مهيأة بعد.</strong>
          <p className="mt-1">
            يجب تشغيل خادم Stirling-PDF وإضافة STIRLING_PDF_URL وSTIRLING_PDF_API_KEY إلى متغيرات البيئة في Vercel.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {operations.map(item => (
          <button
            key={item.id}
            onClick={() => chooseOperation(item.id)}
            className={`rounded-xl border p-4 text-right transition-all ${
              operation === item.id
                ? 'border-[#1a3a5c] ring-2 ring-[#1a3a5c]/20 bg-blue-50 dark:bg-blue-950/30'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="font-bold text-sm text-[#1a3a5c] dark:text-white">{item.title}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{item.description}</div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <label className="block font-bold text-sm mb-2">ملفات PDF</label>
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple={operation === 'merge'}
          onChange={e => setFiles(Array.from(e.target.files || []))}
          className="block w-full text-sm"
        />

        {files.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            {files.length} ملف — {files.map(f => f.name).join('، ')}
          </div>
        )}

        {operation === 'split' && (
          <div className="mt-4">
            <label className="block text-sm font-bold mb-2">أرقام الصفحات</label>
            <input
              value={pageNumbers}
              onChange={e => setPageNumbers(e.target.value)}
              placeholder="مثال: 3 أو 2,5,8"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
            />
          </div>
        )}

        {operation === 'compress' && (
          <div className="mt-4">
            <label className="block text-sm font-bold mb-2">مستوى الضغط: {compression}</label>
            <input
              type="range"
              min="1"
              max="9"
              value={compression}
              onChange={e => setCompression(e.target.value)}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] text-gray-500">
              <span>جودة أعلى</span>
              <span>ضغط أكبر</span>
            </div>
          </div>
        )}

        {operation === 'ocr' && (
          <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-900 p-3 text-xs text-gray-600 dark:text-gray-300">
            سيتم تشغيل OCR باللغة العربية مع تصحيح ميلان الصفحات، مع الاحتفاظ بالصفحات التي تحتوي أصلًا على نص.
          </div>
        )}

        <button
          onClick={process}
          disabled={busy || configured === false}
          className="mt-5 w-full rounded-xl bg-[#1a3a5c] text-white py-3 font-bold disabled:opacity-50"
        >
          {busy ? 'جارٍ المعالجة…' : 'تشغيل الأداة'}
        </button>

        {status && (
          <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-900 p-3 text-sm text-center">
            {status}
          </div>
        )}
      </div>

      <div className="mt-4 text-[11px] text-gray-400 text-center">
        الملفات تُرسل إلى خادم Stirling-PDF المهيأ للتطبيق، ولا تُحفظ في Vercel بواسطة هذه الواجهة.
      </div>
    </div>
  );
}
