'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // التحقق من التثبيت السابق (مخفي البانر نهائياً)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone
      || document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // التحقق من إغلاق سابق للبانر
    const wasDismissed = sessionStorage.getItem('install-banner-dismissed');
    if (wasDismissed) return;

    // التحقق من نظام iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIOS(ios);

    // على iOS: أظهر البانر فوراً
    if (ios) {
      setShowBanner(true);
      return;
    }

    // على Android/Desktop: استمع لحدث التثبيت
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // أظهر البانر تلقائياً فوراً
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      alert('لتثبيت التطبيق على iPhone:\n\n1. اضغط على زر "مشاركة" 📤 (أسفل الشاشة).\n2. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).\n3. اضغط "إضافة".');
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    sessionStorage.setItem('install-banner-dismissed', 'true');
  };

  // لا تُظهر إذا مثبت أو أُغلق أو مخفي
  if (!showBanner || isStandalone || dismissed) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-6 sm:right-6 z-[60]">
      <div className="bg-[#1a3a5c] text-white p-3 sm:p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-10 duration-700">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
            ⚖️
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs sm:text-sm truncate">ثبّت تطبيق "الشامل" على هاتفك</h4>
            <p className="text-[9px] sm:text-[10px] text-white/60 truncate">للوصول سريع بدون متصفح — من الشاشة الرئيسية</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="px-2.5 py-2 text-[10px] sm:text-xs font-medium text-white/40 hover:text-white transition-colors"
          >
            ✕
          </button>
          <button
            onClick={handleInstall}
            className="bg-[#f0c040] text-[#1a3a5c] px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black shadow-lg active:scale-95 transition-transform whitespace-nowrap"
          >
            تثبيت ✓
          </button>
        </div>
      </div>
    </div>
  );
}
