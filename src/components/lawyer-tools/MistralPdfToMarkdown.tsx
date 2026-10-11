'use client';

import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Clipboard,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

interface MistralPdfToMarkdownProps {
  onBack: () => void;
}

interface ConversionResult {
  markdown: string;
  pages: number;
  characters: number;
  model: string;
  filename: string;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024;

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} كيلوبايت`
    : `${(bytes / (1024 * 1024)).toFixed(2)} ميغابايت`;
}

export default function MistralPdfToMarkdown({ onBack }: MistralPdfToMarkdownProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const chooseFile = async (candidate?: File) => {
    setError("");
    setResult(null);
    setCopied(false);
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      setError("اختر ملفًا بامتداد PDF.");
      return;
    }
    if (candidate.size === 0) {
      setFile(null);
      setError("الملف فارغ.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("الحد الأقصى لحجم الملف هو 4 ميغابايت في هذه النسخة.");
      return;
    }
    const header = new TextDecoder().decode(await candidate.slice(0, 5).arrayBuffer());
    if (header !== "%PDF-") {
      setFile(null);
      setError("تعذر التحقق من أن الملف PDF صالح.");
      return;
    }
    setFile(candidate);
  };

  const convert = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/mistral-pdf-to-md", {
        method: "POST",
        body,
      });
      const data = await response.json() as Partial<ConversionResult> & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "تعذر تحويل الملف.");
      }
      if (typeof data.markdown !== "string" || !data.markdown.trim()) {
        throw new Error("لم يصل نص Markdown صالح من الخدمة.");
      }
      setResult({
        markdown: data.markdown,
        pages: Number(data.pages) || 0,
        characters: Number(data.characters) || data.markdown.length,
        model: data.model || "mistral-ocr-latest",
        filename: data.filename || file.name.replace(/\.pdf$/i, "") + ".md",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  };

  const copyMarkdown = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("تعذر النسخ تلقائيًا. حدّد النص وانسخه يدويًا.");
    }
  };

  const downloadMarkdown = () => {
    if (!result) return;
    const blob = new Blob([result.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError("");
    setCopied(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="mx-auto max-w-4xl px-2 sm:px-4" dir="rtl">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="العودة إلى أدوات المحامي"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-[#1a3a5c] transition hover:bg-gray-200 dark:bg-gray-700 dark:text-[#f0c040]"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-[#1a3a5c] dark:text-[#f0c040]">
            <FileText className="h-5 w-5" />
            تحويل PDF إلى Markdown عبر Mistral
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            استخراج النص من ملفات PDF الممسوحة ضوئيًا أو الرقمية مع الحفاظ على بنية Markdown قدر الإمكان.
          </p>
        </div>
      </header>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="font-bold">تنبيه السرية</p>
        <p>
          يُرسل الملف إلى خدمة Mistral لمعالجته. لا يحفظ تطبيق الشامل نسخة دائمة من الملف أو النص الناتج على خادمه،
          لكن يجب مراجعة سياسة Mistral وعدم رفع مستندات سرية إلا وفق قواعد السرية المهنية وسياسة مكتبك.
        </p>
      </div>

      <div
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void chooseFile(event.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition sm:p-10 ${
          dragging
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
            : "border-gray-300 bg-gray-50 hover:border-indigo-400 dark:border-gray-700 dark:bg-gray-800/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(event) => {
            void chooseFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
          <Upload className="h-7 w-7" />
        </div>
        <p className="font-bold text-gray-800 dark:text-gray-100">
          {dragging ? "أفلت ملف PDF هنا" : "اسحب ملف PDF هنا أو اضغط لاختياره"}
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          ملف واحد في كل عملية · الحد الأقصى 4 ميغابايت
        </p>
      </div>

      {file && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <FileText className="h-6 w-6 shrink-0 text-indigo-600 dark:text-indigo-300" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-800 dark:text-gray-100">{file.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatSize(file.size)}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={(event) => { event.stopPropagation(); reset(); }}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-700"
            aria-label="إزالة الملف"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={convert}
          disabled={!file || busy}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1a3a5c] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#274c73] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#f0c040] dark:text-[#1a3a5c]"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {busy ? "جارٍ التحويل عبر Mistral..." : "تحويل إلى Markdown"}
        </button>
        {(file || result) && !busy && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            ملف جديد
          </button>
        )}
      </div>

      {result && (
        <div className="mt-7 overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-900">
          <div className="flex flex-wrap items-center gap-3 bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-emerald-900 dark:text-emerald-200">اكتمل التحويل</p>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                {result.pages} صفحة · {result.characters.toLocaleString("ar-DZ")} حرف · {result.model}
              </p>
            </div>
            <button
              type="button"
              onClick={copyMarkdown}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-200"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "تم النسخ" : "نسخ النص"}
            </button>
            <button
              type="button"
              onClick={downloadMarkdown}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
            >
              <Download className="h-4 w-4" />
              تنزيل .md
            </button>
          </div>
          <textarea
            readOnly
            aria-label="نص Markdown الناتج"
            value={result.markdown}
            spellCheck={false}
            className="min-h-[420px] w-full resize-y bg-white p-4 font-mono text-sm leading-7 text-gray-800 outline-none dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
      )}
    </section>
  );
}
