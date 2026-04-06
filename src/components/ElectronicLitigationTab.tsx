'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

const platforms = [
  {
    title: 'منصة التقاضي الإلكتروني',
    desc: 'خاصة بالسادة المحامين',
    url: 'https://tadjrib.mjustice.dz/login.php',
    icon: '💻',
    bgColor: 'bg-blue-100',
    hoverColor: 'group-hover:text-blue-500',
  },
  {
    title: 'سحب الأحكام الإلكترونية',
    desc: 'من طرف السادة المحامين',
    url: 'https://ejugement.mjustice.dz/login',
    icon: '📋',
    bgColor: 'bg-green-100',
    hoverColor: 'group-hover:text-green-500',
  },
  {
    title: 'شهادات عدم المعارضة',
    desc: 'عدم الاستئناف وعدم الطعن بالنقض',
    url: 'https://cert-nonrecours.mjustice.dz/',
    icon: '📑',
    bgColor: 'bg-purple-100',
    hoverColor: 'group-hover:text-purple-500',
  },
  {
    title: 'صحيفة السوابق العدلية',
    desc: 'طلب صحيفة السوابق القضائية',
    url: 'https://www.mjustice.gov.dz/ar/%d8%b5%d9%80%d8%ad%d9%8a%d9%81%d8%a9%d8%a7%d9%84%d8%b3%d9%88%d8%a7%d8%a8%d9%82-%d8%a7%d9%84%d9%82%d8%b6%d8%a7%d8%a6%d9%8a%d8%a9/',
    icon: '📜',
    bgColor: 'bg-amber-100',
    hoverColor: 'group-hover:text-amber-500',
  },
  {
    title: 'رخصة الاتصال',
    desc: 'طلب الحصول على رخصة الاتصال',
    url: 'https://ziyarati.mjustice.dz/',
    icon: '🎫',
    bgColor: 'bg-teal-100',
    hoverColor: 'group-hover:text-teal-500',
  },
];

const officialLinks = [
  { title: 'بوابة وزارة العدل', url: 'https://www.mjustice.dz', icon: '🏛️' },
  { title: 'الجريدة الرسمية', url: 'https://www.joradp.dz', icon: '📰' },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 بايت';
  const units = ['بايت', 'كيلوبايت', 'ميغابايت', 'غيغابايت'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

type CompressionLevel = 'low' | 'recommended' | 'extreme';

interface FileInfo {
  file: File;
  originalSize: number;
  compressedSize: number | null;
  savingsPercent: number | null;
  downloadUrl: string | null;
  status: 'idle' | 'uploading' | 'compressing' | 'done' | 'error';
  error: string | null;
}

const COMPRESSION_LEVELS: { id: CompressionLevel; label: string; desc: string; icon: string }[] = [
  { id: 'low', label: 'ضغط خفيف', desc: 'أقل جودة للضغط مع الحفاظ على الأصل', icon: '📄' },
  { id: 'recommended', label: 'ضغط متوسط (مُوصى به)', desc: 'توازن مثالي بين الجودة والحجم', icon: '✅' },
  { id: 'extreme', label: 'ضغط شديد', desc: 'أقصى تقليل للحجم (قد تقل الجودة)', icon: '🗜️' },
];

// ===== PDF Compression Section =====
function PdfCompressTool() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('recommended');
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(async (fileInfo: FileInfo) => {
    const formData = new FormData();
    formData.append('file', fileInfo.file);
    formData.append('compression_level', compressionLevel);

    try {
      setFiles(prev =>
        prev.map(f =>
          f.file.name === fileInfo.file.name && f.file.size === fileInfo.file.size
            ? { ...f, status: 'uploading' as const }
            : f
        )
      );

      const response = await fetch('/api/pdf-tools/compress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل ضغط الملف');
      }

      setFiles(prev =>
        prev.map(f =>
          f.file.name === fileInfo.file.name && f.file.size === fileInfo.file.size
            ? { ...f, status: 'compressing' as const }
            : f
        )
      );

      const blob = await response.blob();
      const compressedSize = blob.size;
      const savingsPercent = parseFloat(
        response.headers.get('X-Savings-Percent') || ((1 - compressedSize / fileInfo.originalSize) * 100).toFixed(1)
      );
      const downloadUrl = URL.createObjectURL(blob);

      setFiles(prev =>
        prev.map(f =>
          f.file.name === fileInfo.file.name && f.file.size === fileInfo.file.size
            ? { ...f, compressedSize, savingsPercent, downloadUrl, status: 'done' as const, error: null }
            : f
        )
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setFiles(prev =>
        prev.map(f =>
          f.file.name === fileInfo.file.name && f.file.size === fileInfo.file.size
            ? { ...f, status: 'error' as const, error: errorMsg }
            : f
        )
      );
    }
  }, [compressionLevel]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) return;

    const newFiles: FileInfo[] = pdfFiles.map(file => ({
      file,
      originalSize: file.size,
      compressedSize: null,
      savingsPercent: null,
      downloadUrl: null,
      status: 'idle' as const,
      error: null,
    }));

    setFiles(prev => [...prev, ...newFiles]);
    pdfFiles.forEach((file, index) => {
      setTimeout(() => processFile(newFiles[index]), index * 500);
    });
  }, [processFile]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false),
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const file = prev[index];
      if (file?.downloadUrl) URL.revokeObjectURL(file.downloadUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearAll = useCallback(() => {
    files.forEach(f => { if (f.downloadUrl) URL.revokeObjectURL(f.downloadUrl); });
    setFiles([]);
  }, [files]);

  const downloadAll = useCallback(() => {
    files.filter(f => f.status === 'done' && f.downloadUrl).forEach(f => {
      const a = document.createElement('a');
      a.href = f.downloadUrl!;
      a.download = `compressed_${f.file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }, [files]);

  const retryFile = useCallback((fileInfo: FileInfo) => {
    setFiles(prev =>
      prev.map(f =>
        f.file.name === fileInfo.file.name && f.file.size === fileInfo.file.size
          ? { ...f, status: 'idle' as const, error: null, compressedSize: null, savingsPercent: null, downloadUrl: null }
          : f
      )
    );
    setTimeout(() => processFile({ ...fileInfo, status: 'idle' }), 200);
  }, [processFile]);

  const doneCount = files.filter(f => f.status === 'done').length;
  const processingCount = files.filter(f => f.status === 'uploading' || f.status === 'compressing').length;
  const doneOriginalSize = files.filter(f => f.status === 'done').reduce((s, f) => s + f.originalSize, 0);
  const totalCompressedSize = files.filter(f => f.status === 'done').reduce((s, f) => s + (f.compressedSize || 0), 0);
  const totalSavings = doneOriginalSize > 0 && totalCompressedSize > 0
    ? ((1 - totalCompressedSize / doneOriginalSize) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-5">
      {/* Compression Level Selector */}
      <div className="bg-gradient-to-l from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/50">
        <h3 className="text-sm font-bold text-[#1a3a5c] dark:text-white mb-3 flex items-center gap-2">
          <span className="text-base">⚙️</span> مستوى الضغط
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {COMPRESSION_LEVELS.map(level => (
            <button
              key={level.id}
              onClick={() => setCompressionLevel(level.id)}
              className={`relative p-3 rounded-xl border-2 text-right transition-all duration-200 ${
                compressionLevel === level.id
                  ? 'border-[#1a3a5c] bg-white dark:bg-[#1e293b] shadow-lg'
                  : 'border-transparent bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10'
              }`}
            >
              {compressionLevel === level.id && (
                <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-[#1a3a5c] rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-base">{level.icon}</span>
                <span className="text-xs font-bold text-[#1a3a5c] dark:text-white">{level.label}</span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">{level.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-2xl border-3 transition-all duration-300 ${
          isDragging
            ? 'border-[#1a3a5c] bg-blue-50 dark:bg-blue-950/40 shadow-2xl'
            : 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:border-[#1a3a5c]/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 hover:shadow-lg'
        }`}
        style={{ minHeight: '180px' }}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-center py-12 px-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl mb-4 ${isDragging ? 'bg-[#1a3a5c]/10 dark:bg-[#f0c040]/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {isDragging ? '📥' : '📁'}
          </div>
          <h3 className={`text-base font-bold mb-1.5 ${isDragging ? 'text-[#1a3a5c] dark:text-[#f0c040]' : 'text-gray-700 dark:text-gray-200'}`}>
            {isDragging ? 'أفلت الملفات هنا' : 'اسحب ملفات PDF وأفلتها هنا'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">أو اضغط لاختيار الملفات — يدعم ملفات متعددة</p>
          <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
            <span>PDF فقط</span>
            <span>•</span>
            <span>الحد الأقصى 50MB</span>
          </div>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {/* Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-[#1a3a5c] dark:text-white">{files.length} ملف</span>
              {processingCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" /> جاري المعالجة
                </span>
              )}
              {doneCount > 0 && <span className="text-green-600 dark:text-green-400">✅ {doneCount} مكتمل</span>}
            </div>
            <div className="flex items-center gap-2">
              {totalSavings && (
                <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-full">
                  توفير {totalSavings}%
                </span>
              )}
              {doneCount > 1 && (
                <button onClick={downloadAll} className="px-3 py-1.5 bg-[#1a3a5c] text-white rounded-lg text-[10px] font-bold hover:bg-[#2a4a6c] transition-colors shadow flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  تحميل الكل
                </button>
              )}
              <button onClick={clearAll} className="px-2 py-1.5 text-gray-500 hover:text-red-500 rounded-lg text-[10px] transition-colors">مسح</button>
            </div>
          </div>

          {/* File Cards */}
          <div className="space-y-2">
            {files.map((fileInfo, index) => (
              <div key={`${fileInfo.file.name}-${index}`} className="bg-white dark:bg-gray-800/70 rounded-xl border border-gray-100 dark:border-gray-700 p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-lg">
                    {fileInfo.status === 'done' ? '✅' : fileInfo.status === 'error' ? '❌' : '📄'}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate">{fileInfo.file.name}</h4>
                    {fileInfo.status === 'idle' || fileInfo.status === 'uploading' || fileInfo.status === 'compressing' ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-500">{formatFileSize(fileInfo.originalSize)}</span>
                        {(fileInfo.status === 'uploading' || fileInfo.status === 'compressing') && (
                          <span className="text-[10px] text-blue-500 font-medium flex items-center gap-1">
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                            {fileInfo.status === 'uploading' ? 'جاري الرفع...' : 'جاري الضغط...'}
                          </span>
                        )}
                      </div>
                    ) : fileInfo.status === 'done' ? (
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        <span className="text-gray-400 line-through">{formatFileSize(fileInfo.originalSize)}</span>
                        <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        <span className="text-green-600 dark:text-green-400 font-bold">{formatFileSize(fileInfo.compressedSize!)}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          fileInfo.savingsPercent && fileInfo.savingsPercent > 0 ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        }`}>
                          {fileInfo.savingsPercent !== null && fileInfo.savingsPercent > 0 ? `-${fileInfo.savingsPercent}%` : 'بدون تغيير'}
                        </span>
                      </div>
                    ) : fileInfo.status === 'error' ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-red-500">{fileInfo.error}</span>
                        <button onClick={() => retryFile(fileInfo)} className="text-[10px] text-[#1a3a5c] dark:text-[#f0c040] font-bold hover:underline">إعادة</button>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {fileInfo.status === 'done' && fileInfo.downloadUrl && (
                      <a href={fileInfo.downloadUrl} download={`compressed_${fileInfo.file.name}`}
                        className="px-3 py-1.5 bg-[#1a3a5c] text-white rounded-lg text-[10px] font-bold hover:bg-[#2a4a6c] transition-colors shadow flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        تحميل
                      </a>
                    )}
                    <button onClick={() => removeFile(index)} className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Summary */}
          {doneCount > 0 && (
            <div className="bg-gradient-to-l from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-4 border border-green-100 dark:border-green-900/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎉</span>
                  <div>
                    <h4 className="text-xs font-bold text-green-800 dark:text-green-300">تم ضغط {doneCount} ملف بنجاح</h4>
                    <p className="text-[10px] text-green-600 dark:text-green-400">
                      {formatFileSize(doneOriginalSize)} → {formatFileSize(totalCompressedSize)}
                      {totalSavings && Number(totalSavings) > 0 && <> (تم توفير {formatFileSize(doneOriginalSize - totalCompressedSize)})</>}
                    </p>
                  </div>
                </div>
                {doneCount > 1 && (
                  <button onClick={downloadAll} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    تحميل الكل
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl mb-1">🔒</div>
            <h4 className="text-[10px] font-bold text-[#1a3a5c] dark:text-white">آمن وموثوق</h4>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-relaxed">معالجة آمنة دون تخزين</p>
          </div>
          <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl mb-1">⚡</div>
            <h4 className="text-[10px] font-bold text-[#1a3a5c] dark:text-white">سريع وفعال</h4>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-relaxed">ضغط فوري للملفات الكبيرة</p>
          </div>
          <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl mb-1">⚖️</div>
            <h4 className="text-[10px] font-bold text-[#1a3a5c] dark:text-white">للتقاضي الإلكتروني</h4>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-relaxed">مثالي لمنصة tadjrib</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Main Tab Component =====
export default function ElectronicLitigationTab() {
  const [activeSection, setActiveSection] = useState<'platforms' | 'tools'>('platforms');

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4" dir="rtl">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveSection('platforms')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
            activeSection === 'platforms'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          🏛️ منصات التقاضي
        </button>
        <button
          onClick={() => setActiveSection('tools')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
            activeSection === 'tools'
              ? 'bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] shadow-lg'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          📄 ضغط PDF
        </button>
      </div>

      {activeSection === 'platforms' ? (
        <div className="space-y-4">
          {/* Platform Links */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-blue-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🏛️</span>
              <h3 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">منصات وزارة العدل الإلكترونية</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">خدمات رقمية للمحامين والمواطنين</p>
            <div className="space-y-3">
              {platforms.map((p) => (
                <a
                  key={p.url}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 group"
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-10 h-10 ${p.bgColor} dark:bg-gray-700 rounded-lg flex items-center justify-center text-lg`}>{p.icon}</span>
                    <div>
                      <span className="text-gray-800 dark:text-white font-semibold block text-sm">{p.title}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{p.desc}</span>
                    </div>
                  </span>
                  <span className={`text-gray-300 dark:text-gray-600 ${p.hoverColor} transition-colors text-xl`}>←</span>
                </a>
              ))}
            </div>
          </div>

          {/* Official Links */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-5 flex items-center gap-2">🌐 مواقع رسمية</h3>
            <div className="space-y-3">
              {officialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">{link.icon}</span>
                    <span className="text-gray-700 dark:text-gray-200 font-medium">{link.title}</span>
                  </span>
                  <span className="text-gray-400 group-hover:text-blue-500 transition-colors text-xl">←</span>
                </a>
              ))}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300 text-center">💡 جميع هذه المنصات تابعة لوزارة العدل الجزائرية</p>
          </div>
        </div>
      ) : (
        <PdfCompressTool />
      )}
    </div>
  );
}
