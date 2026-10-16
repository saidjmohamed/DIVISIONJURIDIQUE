'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, degrees as pdfDegrees } from 'pdf-lib';
import EstablishmentDeclaration from './EstablishmentDeclaration';


// Dynamic import for pdfjs-dist — avoids SSR/canvas issues on server
async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  return pdfjsLib;
}

const platforms = [
  { title: 'منصة التقاضي الإلكتروني', desc: 'خاصة بالسادة المحامين', url: 'https://tadjrib.mjustice.dz/login.php', icon: '💻', bgColor: 'bg-blue-100', hoverColor: 'group-hover:text-blue-500' },
  { title: 'سحب الأحكام الإلكترونية', desc: 'من طرف السادة المحامين', url: 'https://ejugement.mjustice.dz/login', icon: '📋', bgColor: 'bg-green-100', hoverColor: 'group-hover:text-green-500' },
  { title: 'شهادات عدم المعارضة', desc: 'عدم الاستئناف وعدم الطعن بالنقض', url: 'https://cert-nonrecours.mjustice.dz/', icon: '📑', bgColor: 'bg-purple-100', hoverColor: 'group-hover:text-purple-500' },
  { title: 'صحيفة السوابق العدلية', desc: 'طلب صحيفة السوابق القضائية', url: 'https://www.mjustice.gov.dz/ar/%d8%b5%d9%80%d8%ad%d9%8a%d9%81%d8%a9%d8%a7%d9%84%d8%b3%d9%88%d8%a7%d8%a8%d9%82-%d8%a7%d9%84%d9%82%d8%b6%d8%a7%d8%a6%d9%8a%d8%a9/', icon: '📜', bgColor: 'bg-amber-100', hoverColor: 'group-hover:text-amber-500' },
  { title: 'رخصة الاتصال', desc: 'طلب الحصول على رخصة الاتصال', url: 'https://ziyarati.mjustice.dz/', icon: '🎫', bgColor: 'bg-teal-100', hoverColor: 'group-hover:text-teal-500' },
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
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

type CompLevel = 'low' | 'recommended' | 'extreme';

interface FileInfo {
  file: File;
  originalSize: number;
  compressedSize: number | null;
  savingsPercent: number | null;
  downloadUrl: string | null;
  status: 'idle' | 'compressing' | 'done' | 'error';
  error: string | null;
}

const LEVELS: { id: CompLevel; label: string; desc: string; icon: string; quality: number }[] = [
  { id: 'low', label: 'ضغط خفيف', desc: 'جودة 85% — حفاظ على الوضوح', icon: '📄', quality: 0.85 },
  { id: 'recommended', label: 'مُوصى به', desc: 'جودة 65% — توازن مثالي', icon: '✅', quality: 0.65 },
  { id: 'extreme', label: 'ضغط شديد', desc: 'جودة 40% — أقصى تقليل', icon: '🗜️', quality: 0.40 },
];

// ===== Client-side PDF compression using pdfjs-dist + Canvas =====
let pdfjsModule: typeof import('pdfjs-dist') | null = null;

async function compressPdfInBrowser(
  file: File,
  quality: number,
  onProgress?: (page: number, total: number) => void,
): Promise<{ blob: Blob; compressedBytes: number }> {
  const originalBuffer = await file.arrayBuffer();
  const originalSize = originalBuffer.byteLength;

  // === Stage 1: Structural optimization (preserves text selectability) ===
  try {
    const pdfDoc = await PDFDocument.load(originalBuffer, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    const newPdf = await PDFDocument.create();
    newPdf.setTitle('');
    newPdf.setAuthor('');
    newPdf.setSubject('');
    newPdf.setKeywords([]);
    newPdf.setProducer('');
    newPdf.setCreator('');
    const pages = await newPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    pages.forEach(p => newPdf.addPage(p));
    const optimizedBytes = await newPdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    // If structural optimization achieved >= 10% reduction, use it
    if (optimizedBytes.byteLength < originalSize * 0.90) {
      const blob = new Blob([optimizedBytes], { type: 'application/pdf' });
      return { blob, compressedBytes: optimizedBytes.byteLength };
    }
  } catch (e) {
    console.warn('PDF structural optimization skipped:', e);
  }

  // === Stage 2: Canvas-based rendering (real compression) ===
  // Renders each page as JPEG image and rebuilds PDF
  // This gives substantial size reduction but text becomes non-selectable

  // Scale factor: higher quality = higher resolution
  const scaleMap: Record<number, number> = { 0.85: 2.0, 0.65: 1.5, 0.40: 1.2 };
  const jpegQualityMap: Record<number, number> = { 0.85: 0.85, 0.65: 0.65, 0.40: 0.40 };
  const scale = scaleMap[quality] || 1.5;
  const jpegQ = jpegQualityMap[quality] || 0.65;

  // Load pdfjs-dist dynamically (client-side only)
  if (!pdfjsModule) pdfjsModule = await loadPdfjs();

  const pdfDoc = await pdfjsModule.getDocument({ data: originalBuffer.slice(0) }).promise;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', jpegQ);
    const base64 = dataUrl.split(',')[1];
    const jpegBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    const image = await newPdf.embedJpg(jpegBytes);
    const pdfPage = newPdf.addPage([viewport.width, viewport.height]);
    pdfPage.drawImage(image, { x: 0, y: 0, width: viewport.width, height: viewport.height });

    onProgress?.(i, pdfDoc.numPages);
  }

  const compressedBytes = await newPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  // If compressed is actually larger (tiny PDFs), return original
  if (compressedBytes.byteLength >= originalSize) {
    return { blob: new Blob([originalBuffer], { type: 'application/pdf' }), compressedBytes: originalSize };
  }

  const blob = new Blob([compressedBytes], { type: 'application/pdf' });
  return { blob, compressedBytes: compressedBytes.byteLength };
}

// ===== PDF Compress Tool =====
function PdfCompressTool() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [level, setLevel] = useState<CompLevel>('recommended');
  const [isDragging, setIsDragging] = useState(false);

  const currentLevel = LEVELS.find(l => l.id === level)!;

  const processFile = useCallback(async (fileInfo: FileInfo) => {
    try {
      setFiles(prev =>
        prev.map(f =>
          f.file === fileInfo.file ? { ...f, status: 'compressing' as const } : f
        )
      );

      const { blob, compressedBytes } = await compressPdfInBrowser(fileInfo.file, currentLevel.quality);
      const savingsPercent = parseFloat(((1 - compressedBytes / fileInfo.originalSize) * 100).toFixed(1));
      const downloadUrl = URL.createObjectURL(blob);

      setFiles(prev =>
        prev.map(f =>
          f.file === fileInfo.file
            ? { ...f, compressedSize: compressedBytes, savingsPercent, downloadUrl, status: 'done' as const, error: null }
            : f
        )
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'حدث خطأ أثناء الضغط';
      setFiles(prev =>
        prev.map(f =>
          f.file === fileInfo.file ? { ...f, status: 'error' as const, error: errorMsg } : f
        )
      );
    }
  }, [currentLevel.quality]);

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
    pdfFiles.forEach((file, i) => setTimeout(() => processFile(newFiles[i]), i * 300));
  }, [processFile]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false),
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 100 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = useCallback((i: number) => {
    setFiles(prev => {
      if (prev[i]?.downloadUrl) URL.revokeObjectURL(prev[i].downloadUrl!);
      return prev.filter((_, idx) => idx !== i);
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

  const retryFile = useCallback((fi: FileInfo) => {
    setFiles(prev =>
      prev.map(f =>
        f.file === fi.file ? { ...f, status: 'idle' as const, error: null, compressedSize: null, savingsPercent: null, downloadUrl: null } : f
      )
    );
    setTimeout(() => processFile({ ...fi, status: 'idle' }), 200);
  }, [processFile]);

  const doneCount = files.filter(f => f.status === 'done').length;
  const busyCount = files.filter(f => f.status === 'compressing').length;
  const doneOrig = files.filter(f => f.status === 'done').reduce((s, f) => s + f.originalSize, 0);
  const doneComp = files.filter(f => f.status === 'done').reduce((s, f) => s + (f.compressedSize || 0), 0);
  const totalSave = doneOrig > 0 && doneComp > 0 ? ((1 - doneComp / doneOrig) * 100).toFixed(1) : null;

  return (
    <div className="space-y-5">
      {/* Level Selector */}
      <div className="bg-gradient-to-l from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/50">
        <h3 className="text-sm font-bold text-[#1a3a5c] dark:text-white mb-3 flex items-center gap-2">
          <span className="text-base">⚙️</span> مستوى الضغط
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map(l => (
            <button key={l.id} onClick={() => setLevel(l.id)}
              className={`relative p-3 rounded-xl border-2 text-right transition-all ${level === l.id ? 'border-[#1a3a5c] bg-white dark:bg-[#1e293b] shadow-lg' : 'border-transparent bg-white/60 dark:bg-white/5 hover:bg-white'}`}>
              {level === l.id && <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-[#1a3a5c] rounded-full flex items-center justify-center"><svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
              <div className="flex items-center gap-1.5 mb-0.5"><span className="text-base">{l.icon}</span><span className="text-xs font-bold text-[#1a3a5c] dark:text-white">{l.label}</span></div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">{l.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div {...getRootProps()} className={`relative cursor-pointer rounded-2xl border-3 transition-all duration-300 ${isDragging ? 'border-[#1a3a5c] bg-blue-50 dark:bg-blue-950/40 shadow-2xl' : 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:border-[#1a3a5c]/50 hover:bg-blue-50/30 hover:shadow-lg'}`} style={{ minHeight: '170px' }}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-center py-10 px-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl mb-3 ${isDragging ? 'bg-[#1a3a5c]/10 dark:bg-[#f0c040]/10' : 'bg-gray-100 dark:bg-gray-800'}`}>{isDragging ? '📥' : '📁'}</div>
          <h3 className={`text-base font-bold mb-1 ${isDragging ? 'text-[#1a3a5c] dark:text-[#f0c040]' : 'text-gray-700 dark:text-gray-200'}`}>{isDragging ? 'أفلت الملفات هنا' : 'اسحب ملفات PDF وأفلتها هنا'}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">أو اضغط لاختيار الملفات — يدعم ملفات متعددة</p>
          <div className="flex items-center gap-3 text-[10px] text-gray-400"><span>PDF فقط</span><span>•</span><span>الحد الأقصى 100MB</span><span>•</span><span>⚡ معالجة فورية في المتصفح</span></div>
        </div>
      </div>

      {/* Files */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-[#1a3a5c] dark:text-white">{files.length} ملف</span>
              {busyCount > 0 && <span className="flex items-center gap-1 text-amber-600"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" /> جاري الضغط...</span>}
              {doneCount > 0 && <span className="text-green-600">✅ {doneCount} مكتمل</span>}
            </div>
            <div className="flex items-center gap-2">
              {totalSave && <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-full">توفير {totalSave}%</span>}
              {doneCount > 1 && <button onClick={downloadAll} className="px-3 py-1.5 bg-[#1a3a5c] text-white rounded-lg text-[10px] font-bold hover:bg-[#2a4a6c] transition-colors shadow">تحميل الكل</button>}
              <button onClick={clearAll} className="px-2 py-1.5 text-gray-500 hover:text-red-500 rounded-lg text-[10px]">مسح</button>
            </div>
          </div>

          <div className="space-y-2">
            {files.map((fi, idx) => (
              <div key={`${fi.file.name}-${idx}`} className="bg-white dark:bg-gray-800/70 rounded-xl border border-gray-100 dark:border-gray-700 p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-lg flex-shrink-0">
                    {fi.status === 'done' ? '✅' : fi.status === 'error' ? '❌' : fi.status === 'compressing' ? '⏳' : '📄'}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate">{fi.file.name}</h4>
                    {fi.status === 'compressing' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-500">{formatFileSize(fi.originalSize)}</span>
                        <span className="text-[10px] text-blue-500 font-medium flex items-center gap-1"><span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" /> جاري الضغط...</span>
                      </div>
                    )}
                    {fi.status === 'done' && (
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        <span className="text-gray-400 line-through">{formatFileSize(fi.originalSize)}</span>
                        <span className="text-gray-300">→</span>
                        <span className="text-green-600 font-bold">{formatFileSize(fi.compressedSize!)}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${fi.savingsPercent && fi.savingsPercent > 0 ? 'bg-green-50 dark:bg-green-950/30 text-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                          {fi.savingsPercent !== null && fi.savingsPercent > 0 ? `-${fi.savingsPercent}%` : 'بدون تغيير'}
                        </span>
                      </div>
                    )}
                    {fi.status === 'error' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-red-500">{fi.error}</span>
                        <button onClick={() => retryFile(fi)} className="text-[10px] text-[#1a3a5c] dark:text-[#f0c040] font-bold hover:underline">إعادة</button>
                      </div>
                    )}
                    {fi.status === 'idle' && <span className="text-[10px] text-gray-400 mt-1 block">في الانتظار...</span>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {fi.status === 'done' && fi.downloadUrl && (
                      <a href={fi.downloadUrl} download={`compressed_${fi.file.name}`} className="px-3 py-1.5 bg-[#1a3a5c] text-white rounded-lg text-[10px] font-bold hover:bg-[#2a4a6c] transition-colors shadow">تحميل</a>
                    )}
                    <button onClick={() => removeFile(idx)} className="p-1 text-gray-400 hover:text-red-500 rounded-lg">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {doneCount > 0 && (
            <div className="bg-gradient-to-l from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-4 border border-green-100 dark:border-green-900/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎉</span>
                  <div>
                    <h4 className="text-xs font-bold text-green-800 dark:text-green-300">تم ضغط {doneCount} ملف بنجاح</h4>
                    <p className="text-[10px] text-green-600 dark:text-green-400">{formatFileSize(doneOrig)} → {formatFileSize(doneComp)}{totalSave && Number(totalSave) > 0 && ` (تم توفير ${formatFileSize(doneOrig - doneComp)})`}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {files.length === 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl mb-1">🔒</div><h4 className="text-[10px] font-bold text-[#1a3a5c] dark:text-white">خصوصية تامة</h4><p className="text-[9px] text-gray-500 leading-relaxed">الملفات لا تغادر جهازك أبداً</p>
          </div>
          <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl mb-1">⚡</div><h4 className="text-[10px] font-bold text-[#1a3a5c] dark:text-white">بدون إنترنت</h4><p className="text-[9px] text-gray-500 leading-relaxed">يعمل في المتصفح مباشرة</p>
          </div>
          <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl mb-1">⚖️</div><h4 className="text-[10px] font-bold text-[#1a3a5c] dark:text-white">للتقاضي الإلكتروني</h4><p className="text-[9px] text-gray-500 leading-relaxed">مثالي لمنصة tadjrib</p>
          </div>
        </div>
      )}
    </div>
  );
}



// ===== Local PDF utilities =====
const PDF_LIMIT_BYTES = 5 * 1024 * 1024;
const PDF_SAFE_TARGET_BYTES = Math.floor(PDF_LIMIT_BYTES * 0.96);
type PdfToolMode = 'compress' | 'merge' | 'split-pages' | 'split-size' | 'extract' | 'rotate';
interface PdfOutput { name: string; blob: Blob; size: number; }

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function parsePageSelection(value: string, totalPages: number): number[] {
  const indexes = new Set<number>();
  for (const raw of value.split(',')) {
    const part = raw.trim();
    if (!part) continue;
    const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (match) {
      const start = Number(match[1]);
      const end = Number(match[2]);
      if (start < 1 || end < start || end > totalPages) throw new Error('النطاق ' + part + ' غير صحيح. عدد الصفحات ' + totalPages + '.');
      for (let page = start; page <= end; page++) indexes.add(page - 1);
    } else {
      const page = Number(part);
      if (!Number.isInteger(page) || page < 1 || page > totalPages) throw new Error('رقم الصفحة «' + part + '» غير صحيح. عدد الصفحات ' + totalPages + '.');
      indexes.add(page - 1);
    }
  }
  return [...indexes].sort((a, b) => a - b);
}

function PdfToolsSuite() {
  const [mode, setMode] = useState<PdfToolMode>('compress');
  const [files, setFiles] = useState<File[]>([]);
  const [outputs, setOutputs] = useState<PdfOutput[]>([]);
  const [pagesPerPart, setPagesPerPart] = useState('10');
  const [pageSelection, setPageSelection] = useState('1-3');
  const [rotation, setRotation] = useState('90');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const modeOptions: { id: PdfToolMode; label: string; icon: string }[] = [
    { id: 'compress', label: 'ضغط وتحسين', icon: '🗜️' },
    { id: 'merge', label: 'دمج ملفات', icon: '🔗' },
    { id: 'split-pages', label: 'تقسيم بالصفحات', icon: '✂️' },
    { id: 'split-size', label: 'تقسيم إلى 5MB', icon: '📦' },
    { id: 'extract', label: 'استخراج صفحات', icon: '📑' },
    { id: 'rotate', label: 'تدوير الصفحات', icon: '🔄' },
  ];

  const chooseFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files || []).filter(file => file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf');
    setFiles(chosen);
    setOutputs([]);
    setError('');
    setProgress('');
    event.target.value = '';
  };

  const saveOutput = (name: string, bytes: Uint8Array): PdfOutput => ({
    name,
    blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }),
    size: bytes.byteLength,
  });

  const runTool = async () => {
    setError('');
    setOutputs([]);
    setProgress('');
    if (!files.length) { setError('اختر ملف PDF واحدًا على الأقل.'); return; }
    if (files.some(file => file.size > 100 * 1024 * 1024)) { setError('يوجد ملف يتجاوز 100 ميغابايت؛ قسّمه أو قلّل حجمه قبل المعالجة.'); return; }
    setBusy(true);
    try {
      const results: PdfOutput[] = [];
      if (mode === 'merge') {
        if (files.length < 2) throw new Error('اختر ملفين PDF على الأقل لدمجهما.');
        const merged = await PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
          setProgress('دمج الملف ' + (i + 1) + ' من ' + files.length + '…');
          const source = await PDFDocument.load(await files[i].arrayBuffer());
          const pages = await merged.copyPages(source, source.getPageIndices());
          pages.forEach(page => merged.addPage(page));
        }
        const bytes = await merged.save({ useObjectStreams: true });
        results.push(saveOutput('الملف المدمج.pdf', bytes));
        if (bytes.byteLength > PDF_LIMIT_BYTES) setProgress('اكتمل الدمج، لكن الملف المدمج يتجاوز 5 ميغابايت؛ استخدم «تقسيم إلى 5MB».');
      } else if (mode === 'split-size') {
        if (files.length !== 1) throw new Error('اختر ملف PDF واحدًا في كل مرة لتقسيمه إلى أجزاء لا تتجاوز 5 ميغابايت.');
        const file = files[0];
        const source = await PDFDocument.load(await file.arrayBuffer());
        const total = source.getPageCount();
        let chunk: number[] = [];
        let part = 1;
        for (let index = 0; index < total; index++) {
          setProgress('فحص الصفحة ' + (index + 1) + ' من ' + total + ' لتحديد حدود الأجزاء…');
          const trialIndexes = [...chunk, index];
          const trial = await PDFDocument.create();
          const trialPages = await trial.copyPages(source, trialIndexes);
          trialPages.forEach(page => trial.addPage(page));
          const trialBytes = await trial.save({ useObjectStreams: true });
          if (trialBytes.byteLength <= PDF_SAFE_TARGET_BYTES) {
            chunk = trialIndexes;
            continue;
          }
          if (chunk.length === 0) {
            if (trialBytes.byteLength <= PDF_LIMIT_BYTES) {
              chunk = trialIndexes;
              continue;
            }
            throw new Error('الصفحة ' + (index + 1) + ' وحدها تتجاوز حد 5 ميغابايت. جرّب ضغط الملف أولًا؛ لا يمكن ضمان تقليل حجم صفحة كبيرة دون إعادة تحويلها إلى صورة.');
          }
          const finished = await PDFDocument.create();
          const finishedPages = await finished.copyPages(source, chunk);
          finishedPages.forEach(page => finished.addPage(page));
          const finishedBytes = await finished.save({ useObjectStreams: true });
          if (finishedBytes.byteLength > PDF_LIMIT_BYTES) throw new Error('تعذر ضمان حد 5 ميغابايت لأحد الأجزاء؛ أعد المحاولة بعد الضغط.');
          results.push(saveOutput(file.name.replace(/\.pdf$/i, '') + ' - الجزء ' + part + '.pdf', finishedBytes));
          part++;
          chunk = [index];
          const single = await PDFDocument.create();
          const singlePages = await single.copyPages(source, chunk);
          singlePages.forEach(page => single.addPage(page));
          const singleBytes = await single.save({ useObjectStreams: true });
          if (singleBytes.byteLength > PDF_LIMIT_BYTES) throw new Error('الصفحة ' + (index + 1) + ' وحدها تتجاوز حد 5 ميغابايت. اضغط الملف أولًا ثم أعد التقسيم.');
        }
        if (chunk.length) {
          const last = await PDFDocument.create();
          const lastPages = await last.copyPages(source, chunk);
          lastPages.forEach(page => last.addPage(page));
          const lastBytes = await last.save({ useObjectStreams: true });
          if (lastBytes.byteLength > PDF_LIMIT_BYTES) throw new Error('تجاوز الجزء الأخير 5 ميغابايت؛ اضغط الملف ثم أعد التقسيم.');
          results.push(saveOutput(file.name.replace(/\.pdf$/i, '') + ' - الجزء ' + part + '.pdf', lastBytes));
        }
        setProgress('اكتمل التقسيم إلى ' + results.length + ' أجزاء. تم التحقق من أن حجم كل جزء لا يتجاوز 5 ميغابايت.');
      } else if (mode === 'split-pages') {
        const perPart = Number(pagesPerPart);
        if (!Number.isInteger(perPart) || perPart < 1) throw new Error('أدخل عدد صفحات صحيحًا لكل جزء.');
        if (files.length !== 1) throw new Error('اختر ملف PDF واحدًا لتقسيمه حسب عدد الصفحات.');
        const file = files[0];
        const source = await PDFDocument.load(await file.arrayBuffer());
        const total = source.getPageCount();
        let part = 1;
        for (let start = 0; start < total; start += perPart) {
          const indexes = Array.from({ length: Math.min(perPart, total - start) }, (_, offset) => start + offset);
          const piece = await PDFDocument.create();
          const pages = await piece.copyPages(source, indexes);
          pages.forEach(page => piece.addPage(page));
          const bytes = await piece.save({ useObjectStreams: true });
          results.push(saveOutput(file.name.replace(/\.pdf$/i, '') + ' - الجزء ' + part + '.pdf', bytes));
          part++;
        }
        setProgress('اكتمل التقسيم إلى ' + results.length + ' أجزاء حسب عدد الصفحات. إذا تجاوز أي جزء 5 ميغابايت، استخدم «تقسيم إلى 5MB».');
      } else if (mode === 'extract') {
        if (files.length !== 1) throw new Error('اختر ملف PDF واحدًا لاستخراج الصفحات منه.');
        const file = files[0];
        const source = await PDFDocument.load(await file.arrayBuffer());
        const indexes = parsePageSelection(pageSelection, source.getPageCount());
        if (!indexes.length) throw new Error('أدخل أرقام الصفحات المراد استخراجها.');
        const extracted = await PDFDocument.create();
        const pages = await extracted.copyPages(source, indexes);
        pages.forEach(page => extracted.addPage(page));
        results.push(saveOutput(file.name.replace(/\.pdf$/i, '') + ' - صفحات مستخرجة.pdf', await extracted.save({ useObjectStreams: true })));
      } else if (mode === 'rotate') {
        const angle = Number(rotation);
        if (![90, 180, 270].includes(angle)) throw new Error('اختر زاوية 90 أو 180 أو 270 درجة.');
        for (const file of files) {
          setProgress('تدوير ' + file.name + '…');
          const doc = await PDFDocument.load(await file.arrayBuffer());
          doc.getPages().forEach(page => page.setRotation(pdfDegrees((page.getRotation().angle + angle) % 360)));
          results.push(saveOutput(file.name.replace(/\.pdf$/i, '') + ' - مدوّر.pdf', await doc.save({ useObjectStreams: true })));
        }
      }
      setOutputs(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذرت معالجة الملف. تأكد من أنه PDF صالح وغير محمي بكلمة مرور.');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const downloadZip = async () => {
    const zipModule = await import('jszip');
    const archive = new zipModule.default();
    outputs.forEach(output => archive.file(output.name, output.blob));
    const blob = await archive.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'أدوات-PDF-النتائج.zip');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚖️</span>
          <div>
            <h3 className="font-black text-amber-950 dark:text-amber-100">تجهيز ملفات منصة التقاضي الإلكتروني</h3>
            <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-200">الحد المطلوب: <strong>5 ميغابايت كحد أقصى لكل ملف</strong>. التقسيم حسب الحجم يستهدف أقل من 5MB ويُراجع حجم كل جزء بعد إنشائه.</p>
            <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-300">تتم المعالجة محليًا داخل المتصفح؛ لا تُرفع ملفاتك إلى خادم الشامل. قد يتعذر تصغير صفحة منفردة كبيرة إلى أقل من 5MB دون تحويلها إلى صورة.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {modeOptions.map(option => (
          <button key={option.id} type="button" onClick={() => { setMode(option.id); setOutputs([]); setError(''); setProgress(''); }}
            className={'rounded-xl border p-3 text-sm font-bold transition-all ' + (mode === option.id ? 'border-[#1a3a5c] bg-[#1a3a5c] text-white shadow' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200')}>
            <span className="block text-xl mb-1">{option.icon}</span>{option.label}
          </button>
        ))}
      </div>

      {mode === 'compress' ? (
        <PdfCompressTool />
      ) : (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4 space-y-3">
            <label className="block text-sm font-bold text-gray-800 dark:text-gray-100">اختيار ملفات PDF</label>
            <input type="file" accept="application/pdf,.pdf" multiple={mode === 'merge' || mode === 'rotate'} onChange={chooseFiles}
              className="block w-full rounded-xl border border-dashed border-gray-300 p-3 text-sm dark:border-gray-600 dark:text-gray-100" />
            <p className="text-xs text-gray-500 dark:text-gray-400">الحد الأقصى للملف المدخل 100 ميغابايت. الملفات تبقى على جهازك.</p>
            {files.length > 0 && <div className="space-y-1">{files.map((file, index) => <div key={file.name + '-' + index} className="flex justify-between gap-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 px-3 py-2 text-xs"><span className="truncate">{index + 1}. {file.name}</span><span className="shrink-0">{formatFileSize(file.size)}</span></div>)}</div>}
          </div>

          {mode === 'split-pages' && <label className="block text-sm font-bold">عدد الصفحات في كل جزء
            <input type="number" min="1" max="10000" value={pagesPerPart} onChange={e => setPagesPerPart(e.target.value)} className="mt-2 block w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800" />
          </label>}
          {mode === 'extract' && <label className="block text-sm font-bold">الصفحات المطلوبة (مثال: 1-3,5,8-10)
            <input value={pageSelection} onChange={e => setPageSelection(e.target.value)} className="mt-2 block w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800" />
          </label>}
          {mode === 'rotate' && <label className="block text-sm font-bold">زاوية التدوير
            <select value={rotation} onChange={e => setRotation(e.target.value)} className="mt-2 block w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800"><option value="90">90 درجة</option><option value="180">180 درجة</option><option value="270">270 درجة</option></select>
          </label>}
          {mode === 'split-size' && <div className="rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">سيُنشأ كل جزء باسم «اسم الملف - الجزء 1.pdf»، «اسم الملف - الجزء 2.pdf» وهكذا. يتم تنزيل كل جزء منفردًا أو جمعها في ملف ZIP واحد.</div>}
          {mode === 'merge' && <p className="text-xs leading-5 text-gray-500">سيُدمج الملفّان أو أكثر بالترتيب الظاهر في قائمة الاختيار. إذا تجاوز الناتج 5MB فقسّمه بعد الدمج.</p>}

          <button type="button" disabled={busy || files.length === 0} onClick={runTool} className="w-full rounded-xl bg-[#1a3a5c] px-4 py-3 font-bold text-white transition hover:bg-[#244a70] disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? 'جارٍ التنفيذ…' : mode === 'merge' ? 'دمج الملفات' : mode === 'split-size' ? 'تقسيم إلى أجزاء لا تتجاوز 5MB' : mode === 'split-pages' ? 'تقسيم حسب عدد الصفحات' : mode === 'extract' ? 'استخراج الصفحات' : 'تدوير ملفات PDF'}
          </button>
          {busy && <p role="status" className="text-center text-sm text-blue-700 dark:text-blue-300">{progress || 'جارٍ تجهيز الملفات…'}</p>}
        </>
      )}

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
      {outputs.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-green-200 bg-green-50/70 p-4 dark:border-green-900 dark:bg-green-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h4 className="font-black text-green-900 dark:text-green-200">اكتملت المعالجة — {outputs.length} ملف</h4><p className="text-xs text-green-800 dark:text-green-300">يمكنك تنزيل كل ملف أو تنزيل النتائج كلها في ZIP.</p></div>
            {outputs.length > 1 && <button type="button" onClick={downloadZip} className="rounded-lg bg-green-700 px-3 py-2 text-xs font-bold text-white">تحميل الكل ZIP</button>}
          </div>
          <div className="space-y-2">{outputs.map((output, index) => (
            <div key={output.name + '-' + index} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 dark:bg-gray-800">
              <div className="min-w-0"><p className="truncate text-sm font-bold text-gray-800 dark:text-gray-100">{output.name}</p><p className={'text-xs ' + (output.size > PDF_LIMIT_BYTES ? 'text-red-600 font-bold' : 'text-green-700 dark:text-green-300')}>{formatFileSize(output.size)}{mode === 'split-size' ? (output.size <= PDF_LIMIT_BYTES ? ' ✓ ضمن حد 5MB' : ' ⚠ يتجاوز 5MB') : ''}</p></div>
              <button type="button" onClick={() => downloadBlob(output.blob, output.name)} className="shrink-0 rounded-lg bg-[#1a3a5c] px-3 py-2 text-xs font-bold text-white">تنزيل</button>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}

// ===== Main =====
export default function ElectronicLitigationTab() {
  const [activeSection, setActiveSection] = useState<'platforms' | 'tools' | 'tasis'>('platforms');

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4" dir="rtl">
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setActiveSection('platforms')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${activeSection === 'platforms' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>🏛️ منصات التقاضي</button>

        <button onClick={() => setActiveSection('tasis')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${activeSection === 'tasis' ? 'bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>📋 إعلان تأسيس</button>
        <button onClick={() => setActiveSection('tools')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${activeSection === 'tools' ? 'bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>🧰 أدوات PDF محلية</button>
      </div>

      {activeSection === 'platforms' ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-blue-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2"><span className="text-2xl">🏛️</span><h3 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">منصات وزارة العدل الإلكترونية</h3></div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">خدمات رقمية للمحامين والمواطنين</p>
            <div className="space-y-3">{platforms.map(p => (
              <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 group">
                <span className="flex items-center gap-3"><span className={`w-10 h-10 ${p.bgColor} dark:bg-gray-700 rounded-lg flex items-center justify-center text-lg`}>{p.icon}</span><div><span className="text-gray-800 dark:text-white font-semibold block text-sm">{p.title}</span><span className="text-gray-500 dark:text-gray-400 text-xs">{p.desc}</span></div></span>
                <span className={`text-gray-300 dark:text-gray-600 ${p.hoverColor} transition-colors text-xl`}>←</span>
              </a>
            ))}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-5 flex items-center gap-2">🌐 مواقع رسمية</h3>
            <div className="space-y-3">{officialLinks.map(link => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group">
                <span className="flex items-center gap-3"><span className="text-lg">{link.icon}</span><span className="text-gray-700 dark:text-gray-200 font-medium">{link.title}</span></span>
                <span className="text-gray-400 group-hover:text-blue-500 transition-colors text-xl">←</span>
              </a>
            ))}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800"><p className="text-sm text-blue-700 dark:text-blue-300 text-center">💡 جميع هذه المنصات تابعة لوزارة العدل الجزائرية</p></div>
        </div>
      ) : activeSection === 'tasis' ? (
        <EstablishmentDeclaration onBack={() => setActiveSection('platforms')} />
      ) : (
        <PdfToolsSuite />
      )}
    </div>
  );
}
