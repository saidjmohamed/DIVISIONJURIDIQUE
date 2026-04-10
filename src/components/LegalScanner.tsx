'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { Download, Share2, Plus, Trash2, RotateCcw, Check, Camera, X, Upload } from 'lucide-react';

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

// ===== Image Processing Utilities =====

/**
 * تحسين جودة الصورة (تحويل إلى أبيض وأسود وتحسين التباين)
 */
function enhanceImage(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // تحويل إلى رمادي وتحسين التباين
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // حساب الرمادي
    const gray = r * 0.299 + g * 0.587 + b * 0.114;

    // تحسين التباين
    const enhanced = gray < 128 ? Math.max(0, gray - 30) : Math.min(255, gray + 30);

    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * كشف حدود الوثيقة (Document Edge Detection)
 */
function detectDocumentEdges(canvas: HTMLCanvasElement): { x: number; y: number; width: number; height: number } | null {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let minX = canvas.width,
    maxX = 0,
    minY = canvas.height,
    maxY = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i];
    if (gray < 200) {
      const pixelIndex = i / 4;
      const x = pixelIndex % canvas.width;
      const y = Math.floor(pixelIndex / canvas.width);

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (minX < maxX && minY < maxY) {
    return {
      x: Math.max(0, minX - 10),
      y: Math.max(0, minY - 10),
      width: Math.min(canvas.width, maxX - minX + 20),
      height: Math.min(canvas.height, maxY - minY + 20),
    };
  }

  return null;
}

/**
 * تصحيح الميلان والمنظور
 */
function correctPerspective(
  canvas: HTMLCanvasElement,
  edges: { x: number; y: number; width: number; height: number }
): HTMLCanvasElement {
  const newCanvas = document.createElement('canvas');
  newCanvas.width = edges.width;
  newCanvas.height = edges.height;

  const ctx = newCanvas.getContext('2d')!;
  ctx.drawImage(canvas, edges.x, edges.y, edges.width, edges.height, 0, 0, edges.width, edges.height);

  return newCanvas;
}

/**
 * معالجة صورة من ملف أو canvas
 */
async function processImage(source: HTMLCanvasElement | File): Promise<string> {
  let canvas: HTMLCanvasElement;

  if (source instanceof File) {
    // تحويل الملف إلى canvas
    const img = new Image();
    const url = URL.createObjectURL(source);

    await new Promise((resolve, reject) => {
      img.onload = () => {
        canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
    });
  } else {
    canvas = source;
  }

  // معالجة الصورة
  let processedCanvas = enhanceImage(canvas);

  // كشف الحدود
  const edges = detectDocumentEdges(processedCanvas);
  if (edges) {
    processedCanvas = correctPerspective(processedCanvas, edges);
  }

  return processedCanvas.toDataURL('image/jpeg', 0.95);
}

// ===== Main Component =====

export default function LegalScanner() {
  const [mode, setMode] = useState<'menu' | 'camera' | 'preview' | 'list'>('menu');
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ScanSession | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // تحميل الجلسات المحفوظة
  useEffect(() => {
    const saved = localStorage.getItem('legalScannerSessions');
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load sessions:', e);
      }
    }
  }, []);

  // حفظ الجلسات
  const saveSessions = useCallback((newSessions: ScanSession[]) => {
    setSessions(newSessions);
    localStorage.setItem('legalScannerSessions', JSON.stringify(newSessions));
  }, []);

  // حالة لتتبع ما إذا كنا في وضع بدء الكاميرا
  const [pendingCamera, setPendingCamera] = useState(false);

  // بدء الكاميرا: ننتقل أولاً لوضع camera ليظهر عنصر video في DOM
  const startCamera = useCallback(() => {
    setCameraError(null);
    setIsProcessing(true);
    setPendingCamera(true);
    setMode('camera');
  }, []);

  // عندما يظهر video element ونكون بانتظار تشغيل الكاميرا
  useEffect(() => {
    if (!pendingCamera || mode !== 'camera') return;

    let cancelled = false;

    const initCamera = async () => {
      try {
        let stream: MediaStream | null = null;

        // محاولة 1: الكاميرا الخلفية بدقة عالية
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1440 },
            },
            audio: false,
          });
        } catch {
          // محاولة 2: دقة قياسية
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment' },
              audio: false,
            });
          } catch {
            // محاولة 3: أي كاميرا
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            } catch {
              throw new Error('لم يتمكن من الوصول للكاميرا. تأكد من منح الصلاحيات.');
            }
          }
        }

        if (cancelled) {
          stream?.getTracks().forEach(t => t.stop());
          return;
        }

        if (stream && videoRef.current) {
          streamRef.current = stream;
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (error) {
        if (cancelled) return;
        const errorMsg = error instanceof Error ? error.message : 'حدث خطأ في الكاميرا';
        setCameraError(errorMsg);
        toast.error(errorMsg);
        setMode('menu');
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
          setPendingCamera(false);
        }
      }
    };

    // ننتظر لحظة حتى يتم رسم video element في DOM
    const timer = setTimeout(initCamera, 100);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pendingCamera, mode]);

  // إيقاف الكاميرا
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // التقاط صورة من الكاميرا
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);

      const imageData = await processImage(canvas);
      setPreviewImage(imageData);
      setMode('preview');
    } catch (error) {
      toast.error('فشل التقاط الصورة');
      console.error('Capture error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // معالجة الملفات المرفوعة
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      const file = files[0];

      // التحقق من نوع الملف
      if (!file.type.startsWith('image/')) {
        toast.error('يرجى اختيار صورة');
        return;
      }

      const imageData = await processImage(file);
      setPreviewImage(imageData);
      setMode('preview');
    } catch (error) {
      toast.error('فشل تحميل الصورة');
      console.error('File upload error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // إضافة صورة إلى الجلسة
  const addPageToSession = useCallback(async () => {
    if (!previewImage) return;

    setIsProcessing(true);
    try {
      const newPage: ScannedPage = {
        id: `page_${Date.now()}`,
        imageData: previewImage,
        timestamp: Date.now(),
      };

      let session = currentSession;
      if (!session) {
        session = {
          id: `session_${Date.now()}`,
          pages: [],
          createdAt: Date.now(),
        };
        setCurrentSession(session);
      }

      const updatedSession = {
        ...session,
        pages: [...session.pages, newPage],
      };
      setCurrentSession(updatedSession);

      setPreviewImage(null);
      // إعادة فتح الكاميرا لالتقاط صفحة أخرى
      // إذا كان الـ stream لا يزال نشطاً نبقى في وضع camera
      if (streamRef.current && streamRef.current.active) {
        setMode('camera');
      } else {
        startCamera();
      }
      toast.success('تمت إضافة الصفحة بنجاح');
    } catch (error) {
      toast.error('فشل إضافة الصفحة');
      console.error('Add page error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [previewImage, currentSession, startCamera]);

  // حفظ كـ PDF
  const saveToPDF = useCallback(async () => {
    if (!currentSession || currentSession.pages.length === 0) {
      toast.error('لا توجد صفحات للحفظ');
      return;
    }

    setIsProcessing(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < currentSession.pages.length; i++) {
        const page = currentSession.pages[i];

        if (i > 0) pdf.addPage();

        const img = new Image();
        img.src = page.imageData;

        await new Promise((resolve, reject) => {
          img.onload = () => {
            const imgWidth = pageWidth;
            const imgHeight = (img.height / img.width) * pageWidth;
            const yPos = imgHeight > pageHeight ? 0 : (pageHeight - imgHeight) / 2;

            pdf.addImage(page.imageData, 'JPEG', 0, yPos, imgWidth, Math.min(imgHeight, pageHeight));
            resolve(null);
          };
          img.onerror = reject;
        });
      }

      const now = new Date();
      const filename = `scan_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.pdf`;

      pdf.save(filename);

      const updatedSession = {
        ...currentSession,
        id: filename.replace('.pdf', ''),
      };

      const newSessions = [...sessions, updatedSession];
      saveSessions(newSessions);

      toast.success(`تم حفظ الملف: ${filename}`);
      setCurrentSession(null);
      setMode('menu');
    } catch (error) {
      toast.error('فشل حفظ الملف');
      console.error('Save PDF error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [currentSession, sessions, saveSessions]);

  // مشاركة الملف
  const shareFile = useCallback(async () => {
    if (!currentSession || currentSession.pages.length === 0) {
      toast.error('لا توجد صفحات للمشاركة');
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < currentSession.pages.length; i++) {
        const page = currentSession.pages[i];
        if (i > 0) pdf.addPage();

        const img = new Image();
        img.src = page.imageData;

        await new Promise((resolve) => {
          img.onload = () => {
            const imgWidth = pageWidth;
            const imgHeight = (img.height / img.width) * pageWidth;
            const yPos = imgHeight > pageHeight ? 0 : (pageHeight - imgHeight) / 2;

            pdf.addImage(page.imageData, 'JPEG', 0, yPos, imgWidth, Math.min(imgHeight, pageHeight));
            resolve(null);
          };
        });
      }

      const blob = pdf.output('blob');
      const file = new File([blob], 'legal_scan.pdf', { type: 'application/pdf' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'وثيقة قضائية',
          text: 'وثيقة قضائية من تطبيق ماسح الوثائق',
        });
        toast.success('تم المشاركة بنجاح');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'legal_scan.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('تم تحميل الملف');
      }
    } catch (error) {
      toast.error('فشلت المشاركة');
      console.error('Share error:', error);
    }
  }, [currentSession]);

  // حذف صفحة
  const deletePage = useCallback((pageId: string) => {
    if (!currentSession) return;

    const updatedPages = currentSession.pages.filter(p => p.id !== pageId);
    if (updatedPages.length === 0) {
      setCurrentSession(null);
      setMode('menu');
      toast.success('تم حذف جميع الصفحات');
    } else {
      setCurrentSession({ ...currentSession, pages: updatedPages });
      toast.success('تم حذف الصفحة');
    }
  }, [currentSession]);

  // حذف جلسة
  const deleteSession = useCallback((sessionId: string) => {
    const newSessions = sessions.filter(s => s.id !== sessionId);
    saveSessions(newSessions);
    toast.success('تم حذف الجلسة');
  }, [sessions, saveSessions]);

  // ===== UI Rendering =====

  if (mode === 'camera') {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay Grid */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="grid grid-cols-3 grid-rows-3 w-full h-full border-2 border-white">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/50" />
              ))}
            </div>
          </div>

          {/* Corner Markers */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-yellow-400" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-yellow-400" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-yellow-400" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-yellow-400" />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              stopCamera();
              setMode('menu');
            }}
            className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            إلغاء
          </button>

          <button
            onClick={capturePhoto}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            {isProcessing ? 'جاري المعالجة...' : 'التقط صورة'}
          </button>
        </div>

        {currentSession && currentSession.pages.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
              ✅ تم التقاط {currentSession.pages.length} صفحة
            </p>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'preview') {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden">
          {previewImage && <img src={previewImage} alt="Preview" className="w-full h-auto" />}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setPreviewImage(null);
              setMode('camera');
            }}
            className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            إعادة التقاط
          </button>

          <button
            onClick={addPageToSession}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="w-5 h-5" />
            {isProcessing ? 'جاري...' : 'قبول'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'list') {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <h3 className="text-lg font-bold text-[#1a3a5c] dark:text-white mb-4">📁 الملفات المحفوظة</h3>

        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">لا توجد ملفات محفوظة</p>
            <button
              onClick={() => setMode('menu')}
              className="py-2 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              العودة للقائمة الرئيسية
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <div
                key={session.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
              >
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 dark:text-white">{session.id}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {session.pages.length} صفحة • {new Date(session.createdAt).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <button
                  onClick={() => deleteSession(session.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setMode('menu')}
          className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          العودة
        </button>
      </div>
    );
  }

  // Menu Mode
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">⚖️</span>
          <h2 className="text-2xl font-bold text-[#1a3a5c] dark:text-white">ماسح الوثائق القضائية</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          تصوير وتحسين وحفظ الوثائق القضائية محليًا بكل أمان
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={startCamera}
          disabled={isProcessing}
          className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg flex items-center justify-center gap-3 text-lg disabled:opacity-50"
        >
          <Camera className="w-6 h-6" />
          📷 {isProcessing ? 'جاري فتح الكاميرا...' : 'تصوير وثيقة جديدة'}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="p-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition-all shadow-lg flex items-center justify-center gap-3 text-lg disabled:opacity-50"
        >
          <Upload className="w-6 h-6" />
          📁 {isProcessing ? 'جاري التحميل...' : 'رفع صورة من الاستوديو'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />

        {currentSession && currentSession.pages.length > 0 && (
          <>
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-bold mb-3">
                ✅ جلسة نشطة: {currentSession.pages.length} صفحة
              </p>
              <div className="grid grid-cols-2 gap-2">
                {currentSession.pages.slice(0, 4).map(page => (
                  <div key={page.id} className="relative rounded-lg overflow-hidden aspect-video bg-gray-200">
                    <img src={page.imageData} alt="Page" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={startCamera}
              disabled={isProcessing}
              className="p-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              إضافة صفحة أخرى
            </button>

            <button
              onClick={saveToPDF}
              disabled={isProcessing}
              className="p-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              {isProcessing ? 'جاري الحفظ...' : '💾 حفظ كـ PDF'}
            </button>

            <button
              onClick={shareFile}
              className="p-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              📤 مشاركة
            </button>

            <button
              onClick={() => {
                setCurrentSession(null);
                toast.success('تم إلغاء الجلسة');
              }}
              className="p-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              إلغاء الجلسة
            </button>
          </>
        )}

        <button
          onClick={() => setMode('list')}
          className="p-3 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          📁 الملفات المحفوظة
        </button>
      </div>

      {cameraError && (
        <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
            ⚠️ <strong>خطأ:</strong> {cameraError}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 leading-relaxed">
            💡 جرب استخدام خيار "رفع صورة من الاستوديو" بدلاً من ذلك.
          </p>
        </div>
      )}

      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          🔒 <strong>الخصوصية:</strong> جميع العمليات تتم محليًا في جهازك. لا يتم رفع أي بيانات إلى خادم.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          💡 <strong>نصيحة:</strong> تأكد من إضاءة جيدة وضع الوثيقة بشكل مستقيم للحصول على أفضل النتائج.
        </p>
      </div>
    </div>
  );
}
