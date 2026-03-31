'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    }
  };

  const handleShare = () => {
    const text = "⚖️ منصة الشامل القانونية الجزائرية — دليلك الرقمي في القانون الجزائري، بحث في القوانين، حساب الآجال، وأدوات المحامي الاحترافية.\n\nتفضل بزيارة المنصة:\n" + window.location.origin;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1a3a5c] to-[#0f172a] text-white flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden" dir="rtl">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-[#f0c040]/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl w-full text-center space-y-8 relative z-10"
      >
        {/* Logo & Title */}
        <div className="space-y-4">
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-24 h-24 bg-[#f0c040] rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-[#f0c040]/20"
          >
            <span className="text-5xl">⚖️</span>
          </motion.div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight">
            الشامل <span className="text-[#f0c040]">القانوني</span>
          </h1>
          <p className="text-blue-200/80 text-lg font-medium">المنصة الرقمية المتكاملة للقانون الجزائري</p>
        </div>

        {/* Sadaqa Jariya Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl space-y-2"
        >
          <p className="text-amber-400/80 text-sm font-bold uppercase tracking-widest">صدقة جارية لروح الوالد الغالي</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white">سايج عبد النور</h2>
          <p className="text-gray-400 text-sm italic">"اللهم اغفر له وارحمه وأسكنه فسيح جناتك"</p>
        </motion.div>

        {/* About Section */}
        <div className="grid sm:grid-cols-2 gap-4 text-right">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <h3 className="text-[#f0c040] font-bold mb-2 flex items-center gap-2">
              <span>👨‍⚖️</span> المطور
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              الأستاذ <span className="text-white font-bold">سايج محمد</span>، محامٍ لدى مجلس قضاء الجزائر، يسعى لرقمنة العمل القانوني وتسهيله.
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <h3 className="text-[#f0c040] font-bold mb-2 flex items-center gap-2">
              <span>🚀</span> المنصة
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              تطبيق ذكي يجمع 116 قانوناً، حاسبة آجال دقيقة، اختصاص إقليمي شامل، وأدوات احترافية للمحامي.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 pt-4">
          <button 
            onClick={onStart}
            className="w-full bg-[#f0c040] hover:bg-[#e0b030] text-[#1a3a5c] py-4 rounded-2xl font-black text-xl shadow-xl shadow-[#f0c040]/20 transition-all active:scale-95"
          >
            دخول المنصة 🏛️
          </button>

          <div className="grid grid-cols-2 gap-3">
            {!isInstalled && deferredPrompt && (
              <button 
                onClick={handleInstall}
                className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold text-sm border border-white/10 transition-all flex items-center justify-center gap-2"
              >
                <span>تثبيت التطبيق</span>
                <span>📥</span>
              </button>
            )}
            <button 
              onClick={handleShare}
              className="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] py-3 rounded-xl font-bold text-sm border border-[#25D366]/20 transition-all flex items-center justify-center gap-2 col-span-2 sm:col-span-1"
            >
              <span>نشر عبر واتساب</span>
              <span>📱</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-gray-500 text-xs pt-4">
          جميع الحقوق محفوظة © {new Date().getFullYear()} - الأستاذ سايج محمد
        </p>
      </motion.div>
    </div>
  );
}
