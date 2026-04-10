'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface ScannedPage {
  id: string;
  imageData: string;
  timestamp: number;
}

interface ScanSession {
  id: string;
  pages: ScannedPage[];
  createdAt: number;
}

/* ─────────── Image Processing ─────────── */

function enhanceForScan(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  // Adaptive threshold: calculate mean brightness
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    sum += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  }
  const mean = sum / (d.length / 4);
  const contrast = 1.5; // boost contrast
  const midpoint = mean;

  for (let i = 0; i < d.length; i += 4) {
    const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    // contrast stretch around midpoint
    let v = ((gray - midpoint) * contrast) + midpoint;
    // sharpen whites, deepen blacks
    if (v > midpoint + 20) v = Math.min(255, v + 15);
    else if (v < midpoint - 20) v = Math.max(0, v - 15);
    v = Math.max(0, Math.min(255, v));
    d[i] = d[i + 1] = d[i + 2] = v;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/* Real-time edge detection for overlay — runs on downscaled frame */
function detectEdgesRealtime(
  video: HTMLVideoElement,
  tempCanvas: HTMLCanvasElement
): { x: number; y: number; w: number; h: number } | null {
  const scale = 0.25;
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  if (w < 10 || h < 10) return null;

  tempCanvas.width = w;
  tempCanvas.height = h;
  const ctx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  // Convert to grayscale + simple edge via Sobel-like threshold
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let edgeCount = 0;

  const margin = Math.round(w * 0.05);

  for (let y = margin; y < h - margin; y++) {
    for (let x = margin; x < w - margin; x++) {
      const idx = (y * w + x) * 4;
      const gray = d[idx] * 0.299 + d[idx + 1] * 0.587 + d[idx + 2] * 0.114;

      // Check gradient vs neighbors
      const idxR = (y * w + (x + 1)) * 4;
      const idxD = ((y + 1) * w + x) * 4;
      const grayR = d[idxR] * 0.299 + d[idxR + 1] * 0.587 + d[idxR + 2] * 0.114;
      const grayD = d[idxD] * 0.299 + d[idxD + 1] * 0.587 + d[idxD + 2] * 0.114;

      const gradient = Math.abs(gray - grayR) + Math.abs(gray - grayD);

      if (gradient > 30) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        edgeCount++;
      }
    }
  }

  // Need enough edges to form a document shape
  const area = (maxX - minX) * (maxY - minY);
  const minArea = w * h * 0.08;
  const maxArea = w * h * 0.95;

  if (edgeCount < 100 || area < minArea || area > maxArea) return null;
  if (minX >= maxX || minY >= maxY) return null;

  // Return as percentages
  return {
    x: (minX / w) * 100,
    y: (minY / h) * 100,
    w: ((maxX - minX) / w) * 100,
    h: ((maxY - minY) / h) * 100,
  };
}

/* ─────────── Component ─────────── */

export default function LegalScanner() {
  const [mode, setMode] = useState<'menu' | 'camera' | 'preview' | 'list'>('menu');
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ScanSession | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [docEdges, setDocEdges] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [pendingCamera, setPendingCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const edgeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const edgeTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Load sessions
  useEffect(() => {
    try {
      const s = localStorage.getItem('legalScannerSessions_v2');
      if (s) setSessions(JSON.parse(s));
    } catch { /* */ }
  }, []);

  const saveSessions = useCallback((s: ScanSession[]) => {
    setSessions(s);
    try { localStorage.setItem('legalScannerSessions_v2', JSON.stringify(s)); } catch { /* */ }
  }, []);

  /* ── Camera lifecycle ── */

  const startCamera = useCallback(() => {
    setCameraError(null);
    setIsProcessing(true);
    setPendingCamera(true);
    setDocEdges(null);
    setMode('camera');
  }, []);

  // Initialize camera after video element mounts
  useEffect(() => {
    if (!pendingCamera || mode !== 'camera') return;
    let cancelled = false;

    const init = async () => {
      try {
        let stream: MediaStream | null = null;

        // Try portrait (tall) at max quality — ideal for document scanning
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
          {
            video: { facingMode: 'environment' },
            audio: false,
          },
          {
            video: true,
            audio: false,
          },
        ];

        for (const constraints of attempts) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch { continue; }
        }

        if (!stream) throw new Error('لم يتمكن من الوصول للكاميرا. تأكد من منح الصلاحيات.');
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        if (videoRef.current) {
          streamRef.current = stream;
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'حدث خطأ في الكاميرا';
        setCameraError(msg);
        toast.error(msg);
        setMode('menu');
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
          setPendingCamera(false);
        }
      }
    };

    const t = setTimeout(init, 150);
    return () => { cancelled = true; clearTimeout(t); };
  }, [pendingCamera, mode]);

  // Real-time edge detection loop
  useEffect(() => {
    if (mode !== 'camera') {
      clearInterval(edgeTimerRef.current);
      setDocEdges(null);
      return;
    }

    if (!edgeCanvasRef.current) {
      edgeCanvasRef.current = document.createElement('canvas');
    }

    edgeTimerRef.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      const edges = detectEdgesRealtime(videoRef.current, edgeCanvasRef.current!);
      setDocEdges(edges);
    }, 300);

    return () => clearInterval(edgeTimerRef.current);
  }, [mode]);

  const stopCamera = useCallback(() => {
    clearInterval(edgeTimerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setDocEdges(null);
  }, []);

  // Flash toggle
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = track.getCapabilities() as Record<string, unknown>;
      if ('torch' in caps) {
        await (track as unknown as { applyConstraints: (c: Record<string, unknown>) => Promise<void> })
          .applyConstraints({ advanced: [{ torch: !flashOn }] } as unknown as Record<string, unknown>);
        setFlashOn(!flashOn);
      } else {
        toast.error('الفلاش غير متاح في هذا الجهاز');
      }
    } catch {
      toast.error('لا يمكن تشغيل الفلاش');
    }
  }, [flashOn]);

  /* ── Capture ── */

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);

      // Enhance scan quality
      enhanceForScan(canvas);

      // Crop to detected edges if available
      if (docEdges) {
        const sx = (docEdges.x / 100) * canvas.width;
        const sy = (docEdges.y / 100) * canvas.height;
        const sw = (docEdges.w / 100) * canvas.width;
        const sh = (docEdges.h / 100) * canvas.height;

        if (sw > 50 && sh > 50) {
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = sw;
          cropCanvas.height = sh;
          const cctx = cropCanvas.getContext('2d')!;
          cctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
          setPreviewImage(cropCanvas.toDataURL('image/jpeg', 0.95));
          setMode('preview');
          return;
        }
      }

      setPreviewImage(canvas.toDataURL('image/jpeg', 0.95));
      setMode('preview');
    } catch {
      toast.error('فشل التقاط الصورة');
    } finally {
      setIsProcessing(false);
    }
  }, [docEdges]);

  /* ── Session management ── */

  const addPageToSession = useCallback(() => {
    if (!previewImage) return;
    const page: ScannedPage = { id: `p_${Date.now()}`, imageData: previewImage, timestamp: Date.now() };

    let session = currentSession;
    if (!session) {
      session = { id: `s_${Date.now()}`, pages: [], createdAt: Date.now() };
    }
    const updated = { ...session, pages: [...session.pages, page] };
    setCurrentSession(updated);
    setPreviewImage(null);

    if (streamRef.current?.active) {
      setMode('camera');
    } else {
      startCamera();
    }
    toast.success(`تمت إضافة الصفحة ${updated.pages.length}`);
  }, [previewImage, currentSession, startCamera]);

  const saveToPDF = useCallback(async () => {
    if (!currentSession || currentSession.pages.length === 0) return;
    setIsProcessing(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < currentSession.pages.length; i++) {
        if (i > 0) pdf.addPage();
        const img = new Image();
        img.src = currentSession.pages[i].imageData;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            const ih = (img.height / img.width) * pw;
            const yy = ih > ph ? 0 : (ph - ih) / 2;
            pdf.addImage(currentSession.pages[i].imageData, 'JPEG', 0, yy, pw, Math.min(ih, ph));
            resolve();
          };
          img.onerror = () => reject(new Error('img'));
        });
      }

      const now = new Date();
      const fn = `scan_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.pdf`;
      pdf.save(fn);

      saveSessions([...sessions, { ...currentSession, id: fn.replace('.pdf', '') }]);
      toast.success(`تم حفظ ${fn}`);
      setCurrentSession(null);
      setMode('menu');
    } catch {
      toast.error('فشل حفظ الملف');
    } finally {
      setIsProcessing(false);
    }
  }, [currentSession, sessions, saveSessions]);

  const shareFile = useCallback(async () => {
    if (!currentSession || currentSession.pages.length === 0) return;
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < currentSession.pages.length; i++) {
        if (i > 0) pdf.addPage();
        const img = new Image();
        img.src = currentSession.pages[i].imageData;
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const ih = (img.height / img.width) * pw;
            pdf.addImage(currentSession.pages[i].imageData, 'JPEG', 0, ih > ph ? 0 : (ph - ih) / 2, pw, Math.min(ih, ph));
            resolve();
          };
        });
      }

      const blob = pdf.output('blob');
      if (navigator.share) {
        await navigator.share({ files: [new File([blob], 'scan.pdf', { type: 'application/pdf' })], title: 'وثيقة ممسوحة' });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'scan.pdf';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    } catch { toast.error('فشلت المشاركة'); }
  }, [currentSession]);

  const deletePage = useCallback((id: string) => {
    if (!currentSession) return;
    const pages = currentSession.pages.filter(p => p.id !== id);
    if (pages.length === 0) { setCurrentSession(null); setMode('menu'); }
    else setCurrentSession({ ...currentSession, pages });
  }, [currentSession]);

  const deleteSession = useCallback((id: string) => {
    saveSessions(sessions.filter(s => s.id !== id));
    toast.success('تم الحذف');
  }, [sessions, saveSessions]);

  const pageCount = currentSession?.pages.length || 0;

  /* ═══════════════════════ CAMERA VIEW — Fullscreen CamScanner Style ═══════════════════════ */

  if (mode === 'camera') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col" dir="rtl">
        {/* Video fills screen in portrait */}
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectFit: 'cover' }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Dark overlay edges */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/70 to-transparent" />
            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />
          </div>

          {/* Document edge detection overlay */}
          {docEdges && (
            <div
              className="absolute border-2 border-green-400 rounded-lg pointer-events-none transition-all duration-300 ease-out"
              style={{
                left: `${docEdges.x}%`,
                top: `${docEdges.y}%`,
                width: `${docEdges.w}%`,
                height: `${docEdges.h}%`,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)',
              }}
            >
              {/* Corner markers — CamScanner style */}
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-green-400 rounded-tr-md" />
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-green-400 rounded-tl-md" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-green-400 rounded-br-md" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-green-400 rounded-bl-md" />
            </div>
          )}

          {/* Status indicator */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10">
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm ${
              docEdges
                ? 'bg-green-500/80 text-white'
                : 'bg-white/20 text-white/80'
            }`}>
              {isProcessing ? '⏳ جاري فتح الكاميرا...' : docEdges ? '✅ تم كشف الوثيقة' : '📄 وجّه الكاميرا نحو الوثيقة'}
            </div>
          </div>

          {/* Top controls */}
          <div className="absolute top-4 right-4 z-10 flex gap-3">
            <button
              onClick={() => { stopCamera(); setMode('menu'); }}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-xl"
            >
              ✕
            </button>
          </div>
          <div className="absolute top-4 left-4 z-10 flex gap-3">
            <button
              onClick={toggleFlash}
              className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center text-xl ${
                flashOn ? 'bg-yellow-400 text-black' : 'bg-black/50 text-white'
              }`}
            >
              {flashOn ? '⚡' : '🔦'}
            </button>
          </div>
        </div>

        {/* Bottom controls — CamScanner style */}
        <div className="bg-black px-6 py-5 flex items-center justify-between safe-bottom">
          {/* Pages counter */}
          <div className="w-16 flex items-center justify-center">
            {pageCount > 0 && (
              <div className="relative">
                <div className="w-12 h-12 rounded-lg border-2 border-white/50 overflow-hidden">
                  <img
                    src={currentSession!.pages[pageCount - 1].imageData}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pageCount}
                </div>
              </div>
            )}
          </div>

          {/* Capture button — large circle */}
          <button
            onClick={capturePhoto}
            disabled={isProcessing}
            className="relative w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform"
          >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-white" />
            {/* Inner button */}
            <div className={`w-16 h-16 rounded-full transition-colors ${
              docEdges ? 'bg-green-400' : 'bg-white'
            }`} />
          </button>

          {/* Done / Save */}
          <div className="w-16 flex items-center justify-center">
            {pageCount > 0 ? (
              <button
                onClick={() => { stopCamera(); setMode('menu'); }}
                className="px-3 py-2 rounded-lg bg-green-500 text-white text-xs font-bold"
              >
                تم ✓
              </button>
            ) : (
              <div className="w-12" />
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════ PREVIEW ═══════════════════════ */

  if (mode === 'preview') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col" dir="rtl">
        <div className="relative flex-1 overflow-hidden flex items-center justify-center p-4">
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full rounded-lg object-contain shadow-2xl"
            />
          )}
        </div>

        <div className="bg-black/90 px-6 py-5 flex gap-3 safe-bottom">
          <button
            onClick={() => {
              setPreviewImage(null);
              if (streamRef.current?.active) setMode('camera');
              else startCamera();
            }}
            className="flex-1 py-3.5 bg-white/10 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:bg-white/20"
          >
            🔄 إعادة
          </button>
          <button
            onClick={addPageToSession}
            className="flex-1 py-3.5 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:bg-green-600"
          >
            ✅ قبول {pageCount > 0 ? `(${pageCount + 1})` : ''}
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════ FILE LIST ═══════════════════════ */

  if (mode === 'list') {
    return (
      <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setMode('menu')} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
          <h3 className="text-lg font-bold text-[#1a3a5c] dark:text-white">📁 الملفات المحفوظة</h3>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد ملفات محفوظة بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-xl flex-shrink-0">📄</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-white truncate">{s.id}</h4>
                  <p className="text-xs text-gray-500">{s.pages.length} صفحة — {new Date(s.createdAt).toLocaleDateString('ar-SA')}</p>
                </div>
                <button onClick={() => deleteSession(s.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════ MENU ═══════════════════════ */

  return (
    <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2d5a8c] dark:from-[#0f2440] dark:to-[#1a3a5c] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📷</span>
          <h2 className="text-xl font-bold">ماسح الوثائق القضائية</h2>
        </div>
        <p className="text-sm text-white/70">مسح ضوئي احترافي — كشف حواف تلقائي — حفظ PDF</p>
      </div>

      {/* Scan button */}
      <button
        onClick={startCamera}
        disabled={isProcessing}
        className="w-full p-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-3 text-lg disabled:opacity-50 active:scale-[0.98]"
      >
        📷 {isProcessing ? 'جاري فتح الكاميرا...' : 'تصوير وثيقة'}
      </button>

      {/* Active session */}
      {currentSession && pageCount > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-green-50 dark:bg-green-950/20 p-4 border-b border-green-100 dark:border-green-900">
            <p className="text-sm font-bold text-green-700 dark:text-green-300">✅ جلسة نشطة — {pageCount} صفحة</p>
          </div>

          {/* Thumbnails */}
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {currentSession.pages.map((page, i) => (
                <div key={page.id} className="relative rounded-lg overflow-hidden aspect-[3/4] bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 group">
                  <img src={page.imageData} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</div>
                  <button
                    onClick={() => deletePage(page.id)}
                    className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >✕</button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={startCamera}
                disabled={isProcessing}
                className="py-3 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:bg-blue-700 disabled:opacity-50"
              >
                📷 إضافة صفحة
              </button>
              <button
                onClick={saveToPDF}
                disabled={isProcessing}
                className="py-3 bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:bg-green-700 disabled:opacity-50"
              >
                💾 حفظ PDF
              </button>
              <button
                onClick={shareFile}
                className="py-3 bg-purple-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:bg-purple-700"
              >
                📤 مشاركة
              </button>
              <button
                onClick={() => { stopCamera(); setCurrentSession(null); toast.success('تم إلغاء الجلسة'); }}
                className="py-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:bg-red-500/20"
              >
                🗑️ إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved files */}
      <button
        onClick={() => setMode('list')}
        className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 active:bg-gray-200 dark:active:bg-gray-700"
      >
        📁 الملفات المحفوظة ({sessions.length})
      </button>

      {cameraError && (
        <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-300">⚠️ {cameraError}</p>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
        <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center leading-relaxed">
          🔒 جميع العمليات تتم محلياً — لا يتم رفع أي بيانات
        </p>
      </div>
    </div>
  );
}
