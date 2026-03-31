'use client';

import { useState, useEffect } from 'react';

export default function ShareBubble() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // التحقق من عدد مرات الظهور السابقة
    const checkVisibility = () => {
      const viewCount = parseInt(localStorage.getItem('shareBubbleViewCount') || '0');
      const hasShared = localStorage.getItem('hasSharedApp') === 'true';

      // إذا شارك التطبيق بالفعل أو ظهرت الفقاعة مرتين، لا تظهرها مجدداً
      if (hasShared || viewCount >= 2) {
        return;
      }

      // إظهار الفقاعة بعد 20 ثانية من التصفح أو عند التمرير لمنتصف الصفحة
      const timer = setTimeout(() => {
        showBubble();
      }, 20000);

      const handleScroll = () => {
        if (window.scrollY > window.innerHeight) {
          showBubble();
          window.removeEventListener('scroll', handleScroll);
        }
      };

      window.addEventListener('scroll', handleScroll);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', handleScroll);
      };
    };

    const showBubble = () => {
      const viewCount = parseInt(localStorage.getItem('shareBubbleViewCount') || '0');
      if (viewCount < 2) {
        setIsVisible(true);
        localStorage.setItem('shareBubbleViewCount', (viewCount + 1).toString());
      }
    };

    checkVisibility();
  }, []);

  const handleShare = () => {
    const text = "⚖️ منصة الشامل القانونية الجزائرية — دليلك الرقمي في القانون الجزائري، بحث في القوانين، حساب الآجال، وأدوات المحامي الاحترافية.\n\nتفضل بزيارة المنصة:\n" + window.location.origin;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setIsVisible(false);
    localStorage.setItem('hasSharedApp', 'true');
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-28 right-6 z-50 animate-in fade-in zoom-in duration-500 max-w-[280px]">
      <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 relative group">
        <button 
          onClick={handleClose}
          className="absolute -top-2 -left-2 w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs hover:bg-gray-300 transition-colors shadow-sm"
        >
          ✕
        </button>
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-2xl animate-bounce">
            📢
          </div>
          <div>
            <h4 className="font-bold text-[#1a3a5c] dark:text-white text-sm mb-1">فضلاً وليس أمراً</h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              إذا أعجبك التطبيق، ساهم في نشره لتعم الفائدة على الجميع.
            </p>
          </div>
          <button 
            onClick={handleShare}
            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20"
          >
            <span>نشر عبر واتساب</span>
            <span className="text-lg">📱</span>
          </button>
        </div>
      </div>
      {/* Arrow */}
      <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white dark:bg-[#1e293b] rotate-45 border-r border-b border-gray-100 dark:border-gray-800"></div>
    </div>
  );
}
