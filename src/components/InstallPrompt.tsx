'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. التحقق مما إذا كان التطبيق مثبتاً بالفعل (Standalone mode)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone 
        || document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    // 2. التحقق من نظام التشغيل iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const ios = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(ios);
      return ios;
    };

    const alreadyStandalone = checkStandalone();
    const iosDevice = checkIOS();

    if (alreadyStandalone) return;

    // 3. الاستماع لحدث قبل التثبيت وتثبيت تلقائي
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // تثبيت تلقائي بعد تأخير قصير
      if (!alreadyStandalone && !iosDevice) {
        setTimeout(() => {
          e.prompt();
          e.userChoice.then((choice: any) => {
            if (choice.outcome === 'accepted') {
              setShowInstallButton(false);
            }
            setDeferredPrompt(null);
          }).catch(() => {});
        }, 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. للمتصفحات التي لا تدعم beforeinstallprompt (مثل Safari على iOS)
    if (iosDevice && !alreadyStandalone) {
      setShowInstallButton(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert('لتثبيت التطبيق على iPhone:\n1. اضغط على زر "مشاركة" (Share) في المتصفح.\n2. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).');
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowInstallButton(false);
    }
    setDeferredPrompt(null);
  };

  if (!showInstallButton || isStandalone) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="bg-[#1a3a5c] text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl">⚖️</div>
          <div>
            <h4 className="font-bold text-sm">ثبت تطبيق "الشامل"</h4>
            <p className="text-[10px] text-white/70">استخدم التطبيق بسرعة وسهولة من شاشتك الرئيسية</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowInstallButton(false)}
            className="px-3 py-2 text-xs font-medium text-white/50 hover:text-white transition-colors"
          >
            لاحقاً
          </button>
          <button 
            onClick={handleInstallClick}
            className="bg-[#f0c040] text-[#1a3a5c] px-4 py-2 rounded-xl text-xs font-black shadow-lg active:scale-95 transition-transform"
          >
            تثبيت الآن
          </button>
        </div>
      </div>
    </div>
  );
}
