'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Check,
  RotateCw,
  Sun,
  Contrast,
  Sparkles,
  FileText,
  ImageIcon,
  CircleDot,
  SlidersHorizontal,
  Eraser,
  RotateCcw,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { processImage, quickPreview } from './image-processing';
import type { ScanMode, ImageAdjustments, EdgeRect } from './types';
import { DEFAULT_ADJUSTMENTS, SCAN_MODE_LABELS } from './types';

interface PreviewEditorProps {
  imageData: string;
  edges: EdgeRect | null;
  initialMode: ScanMode;
  onAccept: (processedImage: string, originalImage: string, mode: ScanMode) => void;
  onRetake: () => void;
}

const MODE_ICONS: Record<ScanMode, React.ReactNode> = {
  document: <FileText className="size-4" />,
  photo: <ImageIcon className="size-4" />,
  bw: <CircleDot className="size-4" />,
  highContrast: <Contrast className="size-4" />,
};

type ToolTab = 'modes' | 'adjust';

export default function PreviewEditor({
  imageData,
  edges,
  initialMode,
  onAccept,
  onRetake,
}: PreviewEditorProps) {
  const [scanMode, setScanMode] = useState<ScanMode>(initialMode);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [removeShadow, setRemoveShadow] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(imageData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<ToolTab>('modes');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Generate preview when mode changes
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const preview = await quickPreview(imageData, scanMode);
        setPreviewUrl(preview);
      } catch {
        setPreviewUrl(imageData);
      }
    }, 150);
    return () => clearTimeout(debounceRef.current);
  }, [imageData, scanMode]);

  const handleRotate = useCallback(() => {
    setAdjustments((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setRemoveShadow(false);
  }, []);

  const handleAccept = useCallback(async () => {
    setIsProcessing(true);
    try {
      const processed = await processImage(
        imageData,
        scanMode,
        adjustments,
        edges,
        removeShadow
      );
      onAccept(processed, imageData, scanMode);
    } catch {
      // Fallback: return raw image
      onAccept(imageData, imageData, scanMode);
    } finally {
      setIsProcessing(false);
    }
  }, [imageData, scanMode, adjustments, edges, removeShadow, onAccept]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" dir="rtl">
      {/* Preview image */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center p-4">
        <motion.img
          key={previewUrl}
          initial={{ opacity: 0.7, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          src={previewUrl}
          alt="معاينة"
          className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
          style={{
            transform: `rotate(${adjustments.rotation}deg)`,
            transition: 'transform 0.3s ease',
          }}
        />

        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <RotateCcw className="size-8 text-white animate-spin" />
              <span className="text-white text-sm font-medium">جاري المعالجة...</span>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

        {/* Quick actions */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            onClick={handleRotate}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white active:bg-black/70"
          >
            <RotateCw className="size-4" />
          </button>
          <button
            onClick={() => setRemoveShadow(!removeShadow)}
            className={cn(
              'w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all',
              removeShadow ? 'bg-amber-500 text-white' : 'bg-black/50 text-white'
            )}
            title="إزالة الظلال"
          >
            <Eraser className="size-4" />
          </button>
          <button
            onClick={handleReset}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white active:bg-black/70"
            title="إعادة تعيين"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      {/* Tool panel */}
      <div className="bg-black/95 backdrop-blur-sm">
        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('modes')}
            className={cn(
              'flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors',
              activeTab === 'modes'
                ? 'text-white border-b-2 border-white'
                : 'text-white/50'
            )}
          >
            <Sparkles className="size-3.5" />
            الأوضاع
          </button>
          <button
            onClick={() => setActiveTab('adjust')}
            className={cn(
              'flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors',
              activeTab === 'adjust'
                ? 'text-white border-b-2 border-white'
                : 'text-white/50'
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            التعديلات
          </button>
        </div>

        {/* Tab content */}
        <div className="px-4 py-3 min-h-[80px]">
          {activeTab === 'modes' && (
            <div className="flex gap-2 justify-center">
              {(Object.keys(SCAN_MODE_LABELS) as ScanMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setScanMode(mode)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all',
                    scanMode === mode
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white/70 active:bg-white/20'
                  )}
                >
                  {MODE_ICONS[mode]}
                  <span className="text-[10px] font-medium">{SCAN_MODE_LABELS[mode]}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'adjust' && (
            <div className="space-y-3">
              {/* Brightness */}
              <div className="flex items-center gap-3">
                <Sun className="size-4 text-white/60 flex-shrink-0" />
                <span className="text-[10px] text-white/60 w-12 flex-shrink-0">السطوع</span>
                <Slider
                  value={[adjustments.brightness]}
                  onValueChange={([v]) =>
                    setAdjustments((p) => ({ ...p, brightness: v }))
                  }
                  min={-50}
                  max={50}
                  step={1}
                  className="flex-1"
                />
                <span className="text-[10px] text-white/40 w-6 text-center">
                  {adjustments.brightness}
                </span>
              </div>

              {/* Contrast */}
              <div className="flex items-center gap-3">
                <Contrast className="size-4 text-white/60 flex-shrink-0" />
                <span className="text-[10px] text-white/60 w-12 flex-shrink-0">التباين</span>
                <Slider
                  value={[adjustments.contrast]}
                  onValueChange={([v]) =>
                    setAdjustments((p) => ({ ...p, contrast: v }))
                  }
                  min={-50}
                  max={50}
                  step={1}
                  className="flex-1"
                />
                <span className="text-[10px] text-white/40 w-6 text-center">
                  {adjustments.contrast}
                </span>
              </div>

              {/* Sharpness */}
              <div className="flex items-center gap-3">
                <Sparkles className="size-4 text-white/60 flex-shrink-0" />
                <span className="text-[10px] text-white/60 w-12 flex-shrink-0">الحدّة</span>
                <Slider
                  value={[adjustments.sharpness]}
                  onValueChange={([v]) =>
                    setAdjustments((p) => ({ ...p, sharpness: v }))
                  }
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-[10px] text-white/40 w-6 text-center">
                  {adjustments.sharpness}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Accept / Retake */}
        <div className="px-4 pb-safe pt-2 pb-4 flex gap-3">
          <button
            onClick={onRetake}
            disabled={isProcessing}
            className="flex-1 py-3.5 bg-white/10 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:bg-white/20 disabled:opacity-50"
          >
            <X className="size-4" />
            إعادة
          </button>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="flex-1 py-3.5 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:bg-emerald-600 disabled:opacity-50"
          >
            <Check className="size-4" />
            {isProcessing ? 'جاري المعالجة...' : 'قبول'}
          </button>
        </div>
      </div>
    </div>
  );
}
