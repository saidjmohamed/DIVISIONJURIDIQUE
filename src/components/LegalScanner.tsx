'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  FolderOpen,
  ScanLine,
  Shield,
  Trash2,
  FileText,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import CameraView from './scanner/CameraView';
import PreviewEditor from './scanner/PreviewEditor';
import PageManager from './scanner/PageManager';
import ExportDialog from './scanner/ExportDialog';

import type {
  ViewMode,
  ScanMode,
  ScannedPage,
  ScanSession,
  EdgeRect,
} from './scanner/types';

const STORAGE_KEY = 'legalScannerSessions_v3';

export default function LegalScanner() {
  const [mode, setMode] = useState<ViewMode>('menu');
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ScanSession | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('document');

  // Camera capture state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedEdges, setCapturedEdges] = useState<EdgeRect | null>(null);

  // Export dialog
  const [showExport, setShowExport] = useState(false);

  // ─── Persistence ───
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) setSessions(JSON.parse(s));
    } catch {
      /* empty */
    }
  }, []);

  const saveSessions = useCallback((s: ScanSession[]) => {
    setSessions(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* empty */
    }
  }, []);

  // ─── Camera handlers ───
  const openCamera = useCallback(() => {
    setMode('camera');
  }, []);

  const handleCapture = useCallback(
    (imageData: string, edges: EdgeRect | null) => {
      setCapturedImage(imageData);
      setCapturedEdges(edges);
      setMode('preview');
    },
    []
  );

  const handleUpload = useCallback((imageData: string) => {
    setCapturedImage(imageData);
    setCapturedEdges(null);
    setMode('preview');
  }, []);

  const handleCloseCamera = useCallback(() => {
    if (currentSession && currentSession.pages.length > 0) {
      setMode('pages');
    } else {
      setMode('menu');
    }
  }, [currentSession]);

  // ─── Preview handlers ───
  const handleAcceptPage = useCallback(
    (processedImage: string, originalImage: string, usedMode: ScanMode) => {
      const page: ScannedPage = {
        id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        originalImage,
        processedImage,
        scanMode: usedMode,
        timestamp: Date.now(),
      };

      setCurrentSession((prev) => {
        const session = prev || {
          id: `s_${Date.now()}`,
          name: '',
          pages: [],
          createdAt: Date.now(),
        };
        return { ...session, pages: [...session.pages, page] };
      });

      setCapturedImage(null);
      setCapturedEdges(null);
      toast.success(
        `تمت إضافة الصفحة ${(currentSession?.pages.length || 0) + 1}`
      );

      // Go back to camera for next page
      setMode('camera');
    },
    [currentSession]
  );

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setCapturedEdges(null);
    setMode('camera');
  }, []);

  // ─── Page management ───
  const handleReorderPages = useCallback((pages: ScannedPage[]) => {
    setCurrentSession((prev) => (prev ? { ...prev, pages } : null));
  }, []);

  const handleDeletePage = useCallback(
    (pageId: string) => {
      setCurrentSession((prev) => {
        if (!prev) return null;
        const pages = prev.pages.filter((p) => p.id !== pageId);
        if (pages.length === 0) {
          setMode('menu');
          return null;
        }
        return { ...prev, pages };
      });
    },
    []
  );

  // ─── Export ───
  const handleExportComplete = useCallback(
    (filename: string) => {
      if (currentSession) {
        const sessionToSave = {
          ...currentSession,
          name: filename.replace('.pdf', ''),
        };
        saveSessions([...sessions, sessionToSave]);
      }
      setShowExport(false);
      setCurrentSession(null);
      setMode('menu');
    },
    [currentSession, sessions, saveSessions]
  );

  const handleShare = useCallback(async () => {
    if (!currentSession || currentSession.pages.length === 0) return;
    // Open export dialog in share mode
    setShowExport(true);
  }, [currentSession]);

  const handleDeleteSession = useCallback(
    (id: string) => {
      saveSessions(sessions.filter((s) => s.id !== id));
      toast.success('تم الحذف');
    },
    [sessions, saveSessions]
  );

  const handleCancelSession = useCallback(() => {
    setCurrentSession(null);
    setMode('menu');
    toast.success('تم إلغاء الجلسة');
  }, []);

  const pageCount = currentSession?.pages.length || 0;
  const lastPageThumb =
    pageCount > 0
      ? currentSession!.pages[pageCount - 1].processedImage
      : undefined;

  // ═══════════════════════ CAMERA VIEW ═══════════════════════
  if (mode === 'camera') {
    return (
      <CameraView
        scanMode={scanMode}
        onScanModeChange={setScanMode}
        onCapture={handleCapture}
        onUpload={handleUpload}
        onClose={handleCloseCamera}
        pageCount={pageCount}
        lastPageThumb={lastPageThumb}
        onViewPages={() => setMode('pages')}
      />
    );
  }

  // ═══════════════════════ PREVIEW / EDITOR ═══════════════════════
  if (mode === 'preview' && capturedImage) {
    return (
      <PreviewEditor
        imageData={capturedImage}
        edges={capturedEdges}
        initialMode={scanMode}
        onAccept={handleAcceptPage}
        onRetake={handleRetake}
      />
    );
  }

  // ═══════════════════════ PAGE MANAGER ═══════════════════════
  if (mode === 'pages' && currentSession) {
    return (
      <>
        <PageManager
          pages={currentSession.pages}
          onReorder={handleReorderPages}
          onDeletePage={handleDeletePage}
          onAddPage={openCamera}
          onExport={() => setShowExport(true)}
          onShare={handleShare}
          onBack={() => setMode('menu')}
        />

        <AnimatePresence>
          {showExport && (
            <ExportDialog
              pages={currentSession.pages}
              onClose={() => setShowExport(false)}
              onExportComplete={handleExportComplete}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // ═══════════════════════ FILE LIST ═══════════════════════
  if (mode === 'list') {
    return (
      <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode('menu')}
            className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="size-5 rotate-180" />
          </button>
          <h3 className="text-lg font-bold text-[#1a3a5c] dark:text-white flex items-center gap-2">
            <FolderOpen className="size-5" />
            الملفات المحفوظة
          </h3>
        </div>

        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700"
          >
            <FolderOpen className="size-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              لا توجد ملفات محفوظة بعد
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3"
              >
                {/* Thumbnail */}
                <div className="w-12 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 flex-shrink-0 border border-gray-200 dark:border-gray-700">
                  {s.pages[0] ? (
                    <img
                      src={s.pages[0].processedImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="size-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-white truncate">
                    {s.name || s.id}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {s.pages.length} صفحة —{' '}
                    {new Date(s.createdAt).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteSession(s.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════ MAIN MENU ═══════════════════════
  return (
    <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#1a3a5c] to-[#2d5a8c] dark:from-[#0f2440] dark:to-[#1a3a5c] rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <ScanLine className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">ماسح الوثائق القضائية</h2>
            <p className="text-xs text-white/60 mt-0.5">مسح ضوئي احترافي بجودة عالية</p>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          {[
            { label: 'كشف تلقائي', icon: <ScanLine className="size-3.5" /> },
            { label: '4 أوضاع مسح', icon: <FileText className="size-3.5" /> },
            { label: 'خصوصية تامة', icon: <Shield className="size-3.5" /> },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-[10px] text-white/50"
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Scan button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onClick={openCamera}
        className="w-full p-5 bg-gradient-to-l from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-3 text-lg active:scale-[0.98]"
      >
        <Camera className="size-6" />
        تصوير وثيقة
      </motion.button>

      {/* Active session */}
      <AnimatePresence>
        {currentSession && pageCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <ScanLine className="size-4" />
                جلسة نشطة — {pageCount} صفحة
              </p>
            </div>

            {/* Thumbnails */}
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2 mb-4">
                {currentSession.pages.slice(0, 7).map((page, i) => (
                  <div
                    key={page.id}
                    className="relative rounded-lg overflow-hidden aspect-[3/4] bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                  >
                    <img
                      src={page.processedImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 text-white text-[8px] font-bold flex items-center justify-center">
                      {i + 1}
                    </div>
                  </div>
                ))}
                {pageCount > 7 && (
                  <div className="rounded-lg aspect-[3/4] bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-500">
                      +{pageCount - 7}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('pages')}
                  className="py-3 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-blue-700 transition-colors"
                >
                  <FileText className="size-4" />
                  إدارة الصفحات
                </button>
                <button
                  onClick={() => {
                    setMode('pages');
                    setTimeout(() => setShowExport(true), 100);
                  }}
                  className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-emerald-700 transition-colors"
                >
                  <FileText className="size-4" />
                  تصدير PDF
                </button>
                <button
                  onClick={openCamera}
                  className="py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
                >
                  <Camera className="size-4" />
                  إضافة صفحة
                </button>
                <button
                  onClick={handleCancelSession}
                  className="py-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-red-100 dark:active:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="size-4" />
                  إلغاء
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved files */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={() => setMode('list')}
        className={cn(
          'w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-colors',
          'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300',
          'border-gray-200 dark:border-gray-700',
          'hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
        )}
      >
        <FolderOpen className="size-4" />
        الملفات المحفوظة ({sessions.length})
      </motion.button>

      {/* Privacy notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700"
      >
        <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center leading-relaxed flex items-center justify-center gap-1.5">
          <Shield className="size-3.5" />
          جميع العمليات تتم محلياً — لا يتم رفع أي بيانات
        </p>
      </motion.div>

      {/* Export dialog (when triggered from menu) */}
      <AnimatePresence>
        {showExport && currentSession && (
          <ExportDialog
            pages={currentSession.pages}
            onClose={() => setShowExport(false)}
            onExportComplete={handleExportComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
