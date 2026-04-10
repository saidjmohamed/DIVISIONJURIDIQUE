'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  X,
  Zap,
  ZapOff,
  Upload,
  RotateCcw,
  ScanLine,
  FileText,
  ImageIcon,
  Contrast,
  CircleDot,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { detectDocumentEdges } from './image-processing';
import type { EdgeRect, ScanMode } from './types';
import { SCAN_MODE_LABELS } from './types';

interface CameraViewProps {
  scanMode: ScanMode;
  onScanModeChange: (mode: ScanMode) => void;
  onCapture: (imageData: string, edges: EdgeRect | null) => void;
  onUpload: (imageData: string) => void;
  onClose: () => void;
  pageCount: number;
  lastPageThumb?: string;
  onViewPages: () => void;
}

const SCAN_MODE_ICONS: Record<ScanMode, React.ReactNode> = {
  document: <FileText className="size-4" />,
  photo: <ImageIcon className="size-4" />,
  bw: <CircleDot className="size-4" />,
  highContrast: <Contrast className="size-4" />,
};

export default function CameraView({
  scanMode,
  onScanModeChange,
  onCapture,
  onUpload,
  onClose,
  pageCount,
  lastPageThumb,
  onViewPages,
}: CameraViewProps) {
  const [cameraReady, setCameraReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [flashOn, setFlashOn] = useState(false);
  const [docEdges, setDocEdges] = useState<EdgeRect | null>(null);
  const [stableFrames, setStableFrames] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const edgeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const edgeTimerRef = useRef<ReturnType<typeof setInterval>>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevEdgesRef = useRef<EdgeRect | null>(null);
  const autoCapturingRef = useRef(false);

  // ─── Camera initialization ───
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const attempts: MediaStreamConstraints[] = [
          {
            video: {
              facingMode: { exact: 'environment' },
              width: { ideal: 2160 },
              height: { ideal: 3840 },
              aspectRatio: { ideal: 3 / 4 },
            },
            audio: false,
          },
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1440 },
              height: { ideal: 2560 },
            },
            audio: false,
          },
          { video: { facingMode: 'environment' }, audio: false },
          { video: true, audio: false },
        ];

        let stream: MediaStream | null = null;
        for (const constraints of attempts) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch {
            continue;
          }
        }

        if (!stream) throw new Error('لم يتمكن من الوصول للكاميرا');
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          if (!cancelled) {
            setCameraReady(true);
            setIsInitializing(false);
          }
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'خطأ في الكاميرا';
        toast.error(msg);
        onClose();
      }
    };

    const t = setTimeout(init, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [onClose]);

  // ─── Cleanup on unmount ───
  useEffect(() => {
    return () => {
      clearInterval(edgeTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ─── Edge detection loop ───
  useEffect(() => {
    if (!cameraReady) return;

    if (!edgeCanvasRef.current) {
      edgeCanvasRef.current = document.createElement('canvas');
    }

    edgeTimerRef.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      const edges = detectDocumentEdges(videoRef.current, edgeCanvasRef.current!);
      setDocEdges(edges);

      // Auto-capture: check stability
      if (edges && prevEdgesRef.current) {
        const dx = Math.abs(edges.x - prevEdgesRef.current.x);
        const dy = Math.abs(edges.y - prevEdgesRef.current.y);
        const dw = Math.abs(edges.w - prevEdgesRef.current.w);
        const dh = Math.abs(edges.h - prevEdgesRef.current.h);
        if (dx < 2 && dy < 2 && dw < 3 && dh < 3) {
          setStableFrames((prev) => prev + 1);
        } else {
          setStableFrames(0);
        }
      } else {
        setStableFrames(0);
      }
      prevEdgesRef.current = edges;
    }, 250);

    return () => clearInterval(edgeTimerRef.current);
  }, [cameraReady]);

  // ─── Auto-capture when stable ───
  useEffect(() => {
    if (stableFrames >= 8 && docEdges && !autoCapturingRef.current) {
      autoCapturingRef.current = true;
      handleCapture();
      // Reset after capture
      setTimeout(() => {
        autoCapturingRef.current = false;
        setStableFrames(0);
      }, 2000);
    }
  }, [stableFrames, docEdges]);

  // ─── Flash toggle ───
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = track.getCapabilities() as Record<string, unknown>;
      if ('torch' in caps) {
        await (
          track as unknown as {
            applyConstraints: (c: Record<string, unknown>) => Promise<void>;
          }
        ).applyConstraints({
          advanced: [{ torch: !flashOn }],
        } as unknown as Record<string, unknown>);
        setFlashOn(!flashOn);
      } else {
        toast.error('الفلاش غير متاح');
      }
    } catch {
      toast.error('لا يمكن تشغيل الفلاش');
    }
  }, [flashOn]);

  // ─── Capture ───
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    onCapture(imageData, docEdges);
  }, [docEdges, onCapture]);

  // ─── File upload ───
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUpload(reader.result);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [onUpload]
  );

  // Auto-capture progress (0 to 100)
  const autoProgress = docEdges ? Math.min(100, (stableFrames / 8) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" dir="rtl">
      {/* Video */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Gradient overlays */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black/80 to-transparent" />
        </div>

        {/* Edge detection overlay */}
        <AnimatePresence>
          {docEdges && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute border-2 border-emerald-400 rounded-lg pointer-events-none"
              style={{
                left: `${docEdges.x}%`,
                top: `${docEdges.y}%`,
                width: `${docEdges.w}%`,
                height: `${docEdges.h}%`,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                transition: 'left 0.3s, top 0.3s, width 0.3s, height 0.3s',
              }}
            >
              {/* Corner markers */}
              {[
                '-top-1 -right-1 border-t-[3px] border-r-[3px] rounded-tr-md',
                '-top-1 -left-1 border-t-[3px] border-l-[3px] rounded-tl-md',
                '-bottom-1 -right-1 border-b-[3px] border-r-[3px] rounded-br-md',
                '-bottom-1 -left-1 border-b-[3px] border-l-[3px] rounded-bl-md',
              ].map((classes, i) => (
                <div
                  key={i}
                  className={`absolute w-7 h-7 border-emerald-400 ${classes}`}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10">
          <motion.div
            layout
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-md flex items-center gap-2',
              isInitializing
                ? 'bg-white/20 text-white/80'
                : docEdges
                  ? 'bg-emerald-500/80 text-white'
                  : 'bg-white/20 text-white/80'
            )}
          >
            {isInitializing ? (
              <>
                <RotateCcw className="size-3.5 animate-spin" />
                جاري فتح الكاميرا...
              </>
            ) : docEdges ? (
              <>
                <ScanLine className="size-3.5" />
                تم كشف الوثيقة
                {autoProgress > 0 && autoProgress < 100 && (
                  <span className="text-[10px] opacity-80">
                    (التقاط تلقائي {Math.round(autoProgress)}%)
                  </span>
                )}
              </>
            ) : (
              <>
                <ScanLine className="size-3.5 opacity-60" />
                وجّه الكاميرا نحو الوثيقة
              </>
            )}
          </motion.div>
        </div>

        {/* Top controls */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white active:bg-black/70"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            onClick={toggleFlash}
            className={cn(
              'w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all',
              flashOn ? 'bg-amber-400 text-black' : 'bg-black/50 text-white'
            )}
          >
            {flashOn ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white active:bg-black/70"
          >
            <Upload className="size-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Scan mode selector + controls */}
      <div className="bg-black/95 backdrop-blur-sm">
        {/* Scan mode pills */}
        <div className="flex justify-center gap-2 px-4 pt-3 pb-2">
          {(Object.keys(SCAN_MODE_LABELS) as ScanMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onScanModeChange(mode)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                scanMode === mode
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/70 active:bg-white/20'
              )}
            >
              {SCAN_MODE_ICONS[mode]}
              {SCAN_MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        {/* Bottom action bar */}
        <div className="px-6 py-4 pb-safe flex items-center justify-between">
          {/* Pages thumbnail */}
          <div className="w-16 flex items-center justify-center">
            {pageCount > 0 && lastPageThumb ? (
              <button onClick={onViewPages} className="relative">
                <div className="w-12 h-14 rounded-lg border-2 border-white/40 overflow-hidden">
                  <img
                    src={lastPageThumb}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pageCount}
                </div>
              </button>
            ) : (
              <div className="w-12" />
            )}
          </div>

          {/* Capture button */}
          <button
            onClick={handleCapture}
            disabled={!cameraReady}
            className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
          >
            {/* Auto-capture progress ring */}
            {autoProgress > 0 && (
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="36"
                  cy="36"
                  r="34"
                  fill="none"
                  stroke="rgba(52,211,153,0.6)"
                  strokeWidth="3"
                  strokeDasharray={`${(autoProgress / 100) * 213.6} 213.6`}
                  className="transition-all duration-200"
                />
              </svg>
            )}
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-[3px] border-white" />
            {/* Inner button */}
            <div
              className={cn(
                'w-[60px] h-[60px] rounded-full transition-colors',
                docEdges ? 'bg-emerald-400' : 'bg-white'
              )}
            />
          </button>

          {/* Done button */}
          <div className="w-16 flex items-center justify-center">
            {pageCount > 0 ? (
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold active:bg-emerald-600"
              >
                تم
              </button>
            ) : (
              <div className="w-12" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
