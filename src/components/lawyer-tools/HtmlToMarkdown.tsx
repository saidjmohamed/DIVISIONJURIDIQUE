'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileCode, Copy, Download, Trash2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import JSZip from 'jszip';

interface ConvertedFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  html: string;
  markdown: string;
  status: 'pending' | 'converting' | 'done' | 'error';
  error?: string;
}

interface HtmlToMarkdownProps {
  onBack: () => void;
}

/* ──────────────────────────────────────────
   دالة تحويل HTML إلى Markdown (أوفلاين)
   ────────────────────────────────────────── */
async function convertHtmlToMarkdown(htmlContent: string): Promise<string> {
  const TurndownService = (await import('turndown')).default;
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
    hr: '---',
  });

  // إزالة السكريبتات والستايلات
  td.addRule('removeScript', {
    filter: ['script', 'style', 'noscript', 'meta', 'link', 'head'],
    replacement() { return ''; },
  });

  // تحسين جداول HTML
  td.addRule('tableRule', {
    filter: 'table',
    replacement(content) {
      if (!content || !content.trim()) return '\n\n';
      const rows = content.split('\n').filter(r => r.trim());
      if (rows.length === 0) return '\n\n';

      const cells: string[][] = [];
      let currentRow: string[] = [];

      for (const row of rows) {
        const clean = row.replace(/^\||\|$/g, '').trim();
        if (clean.includes('|')) {
          currentRow = clean.split('|').map(c => c.trim());
          cells.push(currentRow);
        } else {
          currentRow.push(clean);
          cells.push([...currentRow]);
          currentRow = [];
        }
      }

      if (cells.length === 0) return '\n\n';
      const colCount = Math.max(...cells.map(r => r.length));
      const header = cells[0].concat(Array(colCount - cells[0].length).fill('')).map(c => c || '').join(' | ');
      const separator = Array(colCount).fill('---').join(' | ');
      const body = cells.slice(1).map(r =>
        r.concat(Array(colCount - r.length).fill('')).map(c => c || '').join(' | ')
      ).join('\n');

      return `\n\n| ${header} |\n| ${separator} |\n${body ? '| ' + body.split('\n').join(' |\n| ') + ' |' : ''}\n\n`;
    },
  });

  return td.turndown(htmlContent);
}

/* ──────────────────────────────────────────
   المكون الرئيسي
   ────────────────────────────────────────── */
export default function HtmlToMarkdown({ onBack }: HtmlToMarkdownProps) {
  const [files, setFiles] = useState<ConvertedFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [totalStats, setTotalStats] = useState({ converted: 0, totalChars: 0, totalSize: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── قراءة الملفات المحددة ── */
  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles: ConvertedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) continue;
      const text = await file.text();
      newFiles.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name.replace(/\.(html|htm)$/i, '.md'),
        originalName: file.name,
        size: file.size,
        html: text,
        markdown: '',
        status: 'pending',
      });
    }
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  /* ── Drag & Drop ── */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  /* ── تحويل كل الملفات بالجملة ── */
  const convertAll = async () => {
    setIsConverting(true);
    let convertedCount = 0;
    let totalChars = 0;
    let totalSize = 0;

    for (const file of files) {
      if (file.status === 'done') {
        convertedCount++;
        totalChars += file.markdown.length;
        totalSize += file.size;
        continue;
      }

      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'converting' } : f));

      try {
        const markdown = await convertHtmlToMarkdown(file.html);
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'done', markdown } : f));
        convertedCount++;
        totalChars += markdown.length;
        totalSize += file.size;
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'error', error: String(err) } : f));
      }
    }

    setTotalStats({ converted: convertedCount, totalChars, totalSize });
    setIsConverting(false);
  };

  /* ── نسخ Markdown ── */
  const copyToClipboard = async (file: ConvertedFile) => {
    try {
      await navigator.clipboard.writeText(file.markdown);
      setCopiedId(file.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = file.markdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(file.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  /* ── تحميل ملف واحد ── */
  const downloadSingle = (file: ConvertedFile) => {
    const blob = new Blob([file.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── تحميل الكل كـ ZIP ── */
  const downloadAll = async () => {
    const doneFiles = files.filter(f => f.status === 'done');
    if (doneFiles.length === 0) return;

    if (doneFiles.length === 1) {
      downloadSingle(doneFiles[0]);
      return;
    }

    const zip = new JSZip();
    for (const f of doneFiles) {
      zip.file(f.name, f.markdown);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `html-to-markdown-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── حذف ملف ── */
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setExpandedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  /* ── حذف الكل ── */
  const clearAll = () => {
    setFiles([]);
    setExpandedIds(new Set());
    setTotalStats({ converted: 0, totalChars: 0, totalSize: 0 });
  };

  /* ── تبديل عرض النتيجة ── */
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const doneCount = files.filter(f => f.status === 'done').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  };

  return (
    <div className="max-w-3xl mx-auto px-3" dir="rtl">
      {/* ── الرأس ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-[#1a3a5c] dark:text-[#f0c040] hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          →
        </button>
        <div>
          <h2 className="text-lg font-black text-[#1a3a5c] dark:text-[#f0c040] flex items-center gap-2">
            <span>📝</span> تحويل HTML إلى Markdown
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">تحويل ملفات بالجملة — يعمل بالكامل أوفلاين</p>
        </div>
      </div>

      {/* ── معلومات الأداة ── */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-5">
        <div className="flex items-start gap-2">
          <span className="text-blue-500 mt-0.5">💡</span>
          <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            <p className="font-bold mb-1">كيفية الاستخدام:</p>
            <ul className="space-y-1 mr-4">
              <li>• اسحب ملفات HTML هنا أو اضغط على زر الاختيار</li>
              <li>• يدعم ملفات <span className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded">.html</span> و <span className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded">.htm</span></li>
              <li>• اضغط &quot;تحويل الكل&quot; لمعالجة جميع الملفات دفعة واحدة</li>
              <li>• حمّل النتائج فردياً أو جميعاً مدمجة في ملف ZIP</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── منطقة السحب والإفلات ── */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-[#6366f1] hover:bg-gray-50 dark:hover:bg-gray-750'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
            isDragging ? 'bg-indigo-100 dark:bg-indigo-800' : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <Upload className={`w-7 h-7 ${isDragging ? 'text-[#6366f1]' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1a3a5c] dark:text-white">
              {isDragging ? 'أفلت الملفات هنا...' : 'اسحب ملفات HTML هنا أو اضغط للاختيار'}
            </p>
            <p className="text-xs text-gray-400 mt-1">يدعم تحميل عدة ملفات في آن واحد</p>
          </div>
        </div>
      </motion.div>

      {/* ── أزرار التحكم ── */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap items-center gap-3 mt-5"
          >
            {/* إحصائيات */}
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full text-gray-600 dark:text-gray-300">
                📁 {files.length} ملف
              </span>
              {doneCount > 0 && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-full text-green-700 dark:text-green-400">
                  ✅ {doneCount} تم التحويل
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full text-amber-700 dark:text-amber-400">
                  ⏳ {pendingCount} في الانتظار
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-xs bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-full text-red-700 dark:text-red-400">
                  ❌ {errorCount} خطأ
                </span>
              )}
            </div>

            {/* أزرار الإجراءات */}
            <button
              onClick={convertAll}
              disabled={isConverting || pendingCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1a3a5c] hover:bg-[#2d5986] disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-sm font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isConverting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جارٍ التحويل...
                </>
              ) : (
                <>
                  <FileCode className="w-4 h-4" />
                  تحويل الكل ({pendingCount})
                </>
              )}
            </button>

            {doneCount > 0 && (
              <button
                onClick={downloadAll}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                تحميل {doneCount === 1 ? 'الملف' : 'الكل ZIP'}
              </button>
            )}

            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              مسح
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── قائمة الملفات ── */}
      <div className="mt-5 space-y-3">
        <AnimatePresence>
          {files.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.03 }}
              className={`rounded-xl border overflow-hidden transition-colors ${
                file.status === 'done'
                  ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                  : file.status === 'error'
                  ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                  : file.status === 'converting'
                  ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {/* رأس الملف */}
              <div className="flex items-center gap-3 p-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  file.status === 'done'
                    ? 'bg-green-100 dark:bg-green-800'
                    : file.status === 'error'
                    ? 'bg-red-100 dark:bg-red-800'
                    : file.status === 'converting'
                    ? 'bg-blue-100 dark:bg-blue-800'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {file.status === 'converting' ? (
                    <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : file.status === 'done' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : file.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1a3a5c] dark:text-white truncate">{file.originalName}</p>
                  <p className="text-xs text-gray-400">
                    {formatSize(file.size)}
                    {file.status === 'done' && ` → ${formatSize(new Blob([file.markdown]).size)} MD`}
                  </p>
                </div>

                {/* أزرار الملف */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {file.status === 'done' && (
                    <>
                      <button
                        onClick={() => copyToClipboard(file)}
                        title="نسخ Markdown"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-[#6366f1] hover:text-white transition-all"
                      >
                        {copiedId === file.id ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => downloadSingle(file)}
                        title="تحميل"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-green-500 hover:text-white transition-all"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleExpand(file.id)}
                        title="عرض/إخفاء النتيجة"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-blue-500 hover:text-white transition-all"
                      >
                        {expandedIds.has(file.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    title="حذف"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* عرض Markdown الناتج */}
              <AnimatePresence>
                {expandedIds.has(file.id) && file.status === 'done' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          الناتج: {file.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {file.markdown.length} حرف
                        </span>
                      </div>
                      <pre
                        dir="ltr"
                        className="bg-gray-900 dark:bg-gray-950 text-green-400 text-xs p-4 rounded-xl overflow-auto max-h-72 leading-relaxed font-mono whitespace-pre-wrap break-words"
                      >
                        {file.markdown}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* عرض الخطأ */}
              <AnimatePresence>
                {file.status === 'error' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-red-200 dark:border-red-800 p-3">
                      <p className="text-xs text-red-600 dark:text-red-400">{file.error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── إحصائيات نهائية ── */}
      <AnimatePresence>
        {totalStats.converted > 0 && !isConverting && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-gradient-to-l from-[#1a3a5c] to-[#2d5986] rounded-2xl p-5 text-white"
          >
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <span>📊</span> ملخص التحويل
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-black">{totalStats.converted}</p>
                <p className="text-xs text-blue-200">ملف محوّل</p>
              </div>
              <div>
                <p className="text-2xl font-black">{totalStats.totalChars.toLocaleString('ar-DZ')}</p>
                <p className="text-xs text-blue-200">حرف Markdown</p>
              </div>
              <div>
                <p className="text-2xl font-black">{formatSize(totalStats.totalSize)}</p>
                <p className="text-xs text-blue-200">حجم HTML الأصلي</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── حالة فارغة ── */}
      {files.length === 0 && (
        <div className="text-center mt-8 text-gray-400">
          <p className="text-sm">لم يتم اختيار أي ملف بعد</p>
          <p className="text-xs mt-1">اسحب ملفات HTML إلى المنطقة أعلاه للبدء</p>
        </div>
      )}
    </div>
  );
}
