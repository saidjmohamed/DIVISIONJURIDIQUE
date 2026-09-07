'use client';

import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { AlertTriangle, CheckCircle2, Copy, Download, FileText, Loader2, Upload, X } from 'lucide-react';

interface OcrPage {
  page: number;
  text: string;
  confidence: number;
}

interface OcrResponse {
  ok: boolean;
  filename: string;
  engine: string;
  model: string;
  page_count: number;
  confidence: number;
  text: string;
  pages: OcrPage[];
  warning?: string;
  error?: string;
}

export default function ArabicPdfOcr({ onBack }: { onBack?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<OcrResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    maxSize: 20 * 1024 * 1024,
  });

  const confidenceLabel = useMemo(() => {
    if (!result) return '';
    const value = Math.round(result.confidence * 100);
    if (value >= 90) return `ثقة مرتفعة تقريباً: ${value}%`;
    if (value >= 75) return `ثقة متوسطة تقريباً: ${value}%`;
    return `ثقة منخفضة تقريباً: ${value}%`;
  }, [result]);

  async function runOcr() {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/tools/ocr', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ OCR.');
      setResult(data as OcrResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  }

  async function copyText() {
    if (!result?.text) return;
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadText() {
    if (!result?.text) return;
    const blob = new Blob([result.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(result.filename || 'document').replace(/\.pdf$/i, '')}-OCR.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-[#1a3a5c] dark:text-[#f0c040]">تحويل PDF المصوّر إلى نص</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">OCR عربي متخصص للمستندات القضائية الممسوحة ضوئياً</p>
        </div>
        {onBack && (
          <button onClick={onBack} className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
            العودة
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-blue-100 dark:border-gray-700 bg-blue-50/50 dark:bg-gray-900/40 p-4 mb-5">
        <div className="flex gap-3 items-start">
          <FileText className="w-5 h-5 text-[#1a3a5c] dark:text-[#f0c040] mt-0.5 shrink-0" />
          <div className="text-sm leading-7 text-gray-700 dark:text-gray-300">
            <strong>المحرك:</strong> PaddleOCR 3.7.0 + نموذج PP-OCRv5 العربي. يدعم العربية والأرقام والإنجليزية، مع ترتيب النص العربي من اليمين إلى اليسار.
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">الحد الحالي: 20 MB و100 صفحة للعملية الواحدة من الواجهة.</div>
          </div>
        </div>
      </div>

      {!result && (
        <>
          <div
            {...getRootProps()}
            className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-[#1a3a5c] bg-blue-50 dark:bg-blue-950/30'
                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-[#1a3a5c]/60'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 mx-auto mb-3 text-[#1a3a5c] dark:text-[#f0c040]" />
            <p className="font-bold text-gray-800 dark:text-white">اسحب ملف PDF هنا أو اضغط لاختياره</p>
            <p className="text-xs text-gray-500 mt-2">يُفضّل الملفات المصوّرة بدقة 200–300 DPI</p>
          </div>

          {file && (
            <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-red-600" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate">{file.name}</div>
                <div className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <button onClick={() => setFile(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="إزالة الملف">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={runOcr}
            disabled={!file || loading}
            className="w-full mt-4 rounded-xl py-3 font-bold text-white bg-[#1a3a5c] hover:bg-[#12304d] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> جارٍ استخراج النص...</> : <><FileText className="w-5 h-5" /> بدء تحويل PDF إلى نص</>}
          </button>
        </>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300">
          <div className="flex gap-2 items-start"><AlertTriangle className="w-5 h-5 shrink-0" /> <span>{error}</span></div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 p-4">
            <div className="flex items-center gap-2 font-bold text-green-700 dark:text-green-300">
              <CheckCircle2 className="w-5 h-5" /> تم استخراج النص بنجاح
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
              <div><span className="text-gray-500">الصفحات</span><div className="font-bold">{result.page_count}</div></div>
              <div><span className="text-gray-500">المحرك</span><div className="font-bold">PaddleOCR</div></div>
              <div><span className="text-gray-500">النموذج</span><div className="font-bold">PP-OCRv5 عربي</div></div>
              <div><span className="text-gray-500">التقييم</span><div className="font-bold">{confidenceLabel}</div></div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={copyText} className="px-4 py-2 rounded-lg bg-[#1a3a5c] text-white text-sm font-bold flex items-center gap-2"><Copy className="w-4 h-4" /> {copied ? 'تم النسخ' : 'نسخ النص'}</button>
            <button onClick={downloadText} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-bold flex items-center gap-2"><Download className="w-4 h-4" /> تحميل TXT</button>
            <button onClick={() => { setResult(null); setFile(null); }} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">ملف جديد</button>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-bold">النص المستخرج</div>
            <textarea
              value={result.text}
              onChange={(event) => setResult({ ...result, text: event.target.value })}
              dir="rtl"
              className="w-full min-h-[520px] p-5 bg-transparent outline-none resize-y text-[15px] leading-8 font-[Noto_Sans_Arabic,Arial,sans-serif]"
              spellCheck={false}
            />
          </div>

          <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-800 dark:text-amber-200 flex gap-2 items-start">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{result.warning || 'راجع النص يدوياً قبل الاعتماد عليه في مذكرة أو عريضة أو ملف قضائي.'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
