'use client';

import { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { motion } from 'framer-motion';
import {
  X,
  Download,
  FileText,
  Share2,
  Loader2,
  Check,
  Stamp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ScannedPage, PageSize } from './types';
import { PAGE_SIZE_LABELS, PAGE_SIZE_DIMENSIONS } from './types';

interface ExportDialogProps {
  pages: ScannedPage[];
  onClose: () => void;
  onExportComplete: (filename: string) => void;
}

export default function ExportDialog({
  pages,
  onClose,
  onExportComplete,
}: ExportDialogProps) {
  const now = new Date();
  const defaultName = `scan_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  const [filename, setFilename] = useState(defaultName);
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [addWatermark, setAddWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportMode, setExportMode] = useState<'download' | 'share'>('download');

  const generatePDF = useCallback(async (): Promise<jsPDF> => {
    const dim = PAGE_SIZE_DIMENSIONS[pageSize];
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [dim.w, dim.h],
    });

    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      setProgress(Math.round(((i + 1) / pages.length) * 80));

      const img = new Image();
      img.src = pages[i].processedImage;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const ratio = img.width / img.height;
          let imgW = pw;
          let imgH = imgW / ratio;

          if (imgH > ph) {
            imgH = ph;
            imgW = imgH * ratio;
          }

          const x = (pw - imgW) / 2;
          const y = (ph - imgH) / 2;

          pdf.addImage(
            pages[i].processedImage,
            'JPEG',
            x,
            y,
            imgW,
            imgH,
            undefined,
            'MEDIUM'
          );

          // Watermark
          if (addWatermark && watermarkText.trim()) {
            pdf.setFontSize(12);
            pdf.setTextColor(180, 180, 180);
            pdf.text(watermarkText.trim(), pw / 2, ph - 8, { align: 'center' });
          }

          resolve();
        };
        img.onerror = () => reject(new Error('img'));
      });
    }

    setProgress(100);
    return pdf;
  }, [pages, pageSize, addWatermark, watermarkText]);

  const handleDownload = useCallback(async () => {
    setIsExporting(true);
    setExportMode('download');
    setProgress(0);
    try {
      const pdf = await generatePDF();
      pdf.save(`${filename}.pdf`);
      toast.success(`تم حفظ ${filename}.pdf`);
      onExportComplete(`${filename}.pdf`);
    } catch {
      toast.error('فشل إنشاء الملف');
    } finally {
      setIsExporting(false);
    }
  }, [filename, generatePDF, onExportComplete]);

  const handleShare = useCallback(async () => {
    setIsExporting(true);
    setExportMode('share');
    setProgress(0);
    try {
      const pdf = await generatePDF();
      const blob = pdf.output('blob');

      if (navigator.share) {
        await navigator.share({
          files: [
            new File([blob], `${filename}.pdf`, { type: 'application/pdf' }),
          ],
          title: filename,
        });
        toast.success('تمت المشاركة');
      } else {
        // Fallback: download
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${filename}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        toast.success(`تم حفظ ${filename}.pdf`);
      }
      onExportComplete(`${filename}.pdf`);
    } catch {
      toast.error('فشلت المشاركة');
    } finally {
      setIsExporting(false);
    }
  }, [filename, generatePDF, onExportComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      dir="rtl"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-xl p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FileText className="size-5 text-emerald-600" />
            تصدير PDF
          </h3>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl px-4 py-2.5 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <FileText className="size-4 flex-shrink-0" />
          {pages.length} صفحة جاهزة للتصدير
        </div>

        {/* Filename */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            اسم الملف
          </label>
          <div className="flex gap-2 items-center">
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="اسم الملف"
              className="flex-1 text-sm"
              disabled={isExporting}
            />
            <span className="text-xs text-gray-400">.pdf</span>
          </div>
        </div>

        {/* Page size */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            حجم الصفحة
          </label>
          <div className="flex gap-2">
            {(Object.keys(PAGE_SIZE_LABELS) as PageSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setPageSize(size)}
                disabled={isExporting}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-medium transition-all border',
                  pageSize === size
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-400'
                )}
              >
                {PAGE_SIZE_LABELS[size]}
              </button>
            ))}
          </div>
        </div>

        {/* Watermark */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <Stamp className="size-3.5" />
              علامة مائية
            </label>
            <Switch
              checked={addWatermark}
              onCheckedChange={setAddWatermark}
              disabled={isExporting}
            />
          </div>
          {addWatermark && (
            <Input
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="نص العلامة المائية..."
              className="text-sm"
              disabled={isExporting}
            />
          )}
        </div>

        {/* Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-[10px] text-gray-500 text-center">
              {progress < 80 ? 'جاري معالجة الصفحات...' : 'جاري الحفظ...'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleDownload}
            disabled={isExporting || !filename.trim()}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {isExporting && exportMode === 'download' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : progress === 100 && exportMode === 'download' ? (
              <Check className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            تحميل
          </button>
          <button
            onClick={handleShare}
            disabled={isExporting || !filename.trim()}
            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isExporting && exportMode === 'share' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Share2 className="size-4" />
            )}
            مشاركة
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
