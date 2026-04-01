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

  const features = [
    {
      title: "116 قانوناً جزائرياً",
      description: "قاعدة بيانات ضخمة تضم كافة القوانين الأساسية والفرعية المحدثة، مع محرك بحث ذكي يبحث في آلاف المواد القانونية في أجزاء من الثانية.",
      icon: "📜",
      color: "from-blue-600 to-blue-800"
    },
    {
      title: "حاسبة الآجال القضائية",
      description: "نظام برمي دقيق لحساب مواعيد الطعون والآجال القانونية، يأخذ في الاعتبار العطل الرسمية وعطل نهاية الأسبوع في الجزائر لضمان عدم ضياع الحقوق.",
      icon: "📅",
      color: "from-amber-500 to-amber-700"
    },
    {
      title: "الاختصاص الإقليمي والنوعي",
      description: "حدد الجهة القضائية المختصة (محكمة، مجلس، محكمة إدارية) لكل بلديات الوطن الـ 1541 بضغطة زر، مع تفصيل كامل للهيكل القضائي التابع لها.",
      icon: "🏛️",
      color: "from-emerald-600 to-emerald-800"
    },
    {
      title: "اجتهادات المحكمة العليا",
      description: "تصفح وابحث في أهم قرارات واجتهادات المحكمة العليا لتوجيه عملك القانوني وضمان مطابقة مذكراتك لأحدث التوجهات القضائية.",
      icon: "⚖️",
      color: "from-purple-600 to-purple-800"
    },
    {
      title: "أدوات المحامي المهنية",
      description: "مجموعة أدوات متخصصة للتحقق من البيانات الإلزامية للعرائض، صياغة المذكرات القانونية الجاهزة، وتحليل منطوق الأحكام واستخراج طرق الطعن.",
      icon: "💼",
      color: "from-red-600 to-red-800"
    },
    {
      title: "الذكاء الاصطناعي القانوني",
      description: "مساعد ذكي مدعم بنموذج Gemini 2.5 Flash للإجابة على استفساراتك القانونية وتلخيص النصوص المعقدة بسرعة ودقة.",
      icon: "🤖",
      color: "from-indigo-600 to-indigo-800"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white overflow-x-hidden font-sans" dir="rtl">
      {/* Hero Section */}
      <div className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f172a] z-10" />
        <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80')] bg-cover bg-center" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 text-center px-4 max-w-4xl"
        >
          <div className="inline-block px-4 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-500 text-xs font-bold mb-6 tracking-widest animate-pulse">
            المنصة القانونية الجزائرية الأولى
          </div>
          <h1 className="text-5xl sm:text-7xl font-black mb-6 tracking-tighter leading-tight">
            الشامل <span className="text-amber-500">القانوني</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-10 leading-relaxed font-medium">
            بوابتك الرقمية المتكاملة للتشريع الجزائري، الاجتهاد القضائي، والأدوات المهنية لأسرة الدفاع.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={onStart}
              className="px-10 py-4 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition-all transform hover:scale-105 shadow-xl"
            >
              ابدأ الاستخدام الآن
            </button>
            <div className="flex gap-2">
              {!isInstalled && deferredPrompt && (
                <button 
                  onClick={handleInstall}
                  className="px-6 py-4 bg-white/10 backdrop-blur-md text-white font-black rounded-xl border border-white/20 hover:bg-white/20 transition-all"
                >
                  تثبيت التطبيق 📥
                </button>
              )}
              <button 
                onClick={handleShare}
                className="px-6 py-4 bg-green-500/20 backdrop-blur-md text-green-500 font-black rounded-xl border border-green-500/20 hover:bg-green-500/30 transition-all"
              >
                نشر عبر واتساب 📱
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Features Section (Netflix Style) */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="flex items-center gap-4 mb-12">
          <div className="h-8 w-1.5 bg-amber-500 rounded-full" />
          <h2 className="text-3xl font-black">خصائص المنصة</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-[#1e293b] rounded-3xl overflow-hidden border border-white/5 hover:border-amber-500/50 transition-all duration-500 shadow-2xl"
            >
              <div className={`h-2 w-full bg-gradient-to-r ${feature.color}`} />
              <div className="p-8">
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-500 inline-block">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black mb-4 text-white group-hover:text-amber-500 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm font-medium">
                  {feature.description}
                </p>
              </div>
              <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-amber-500">
                  ←
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Developer Section */}
      <div className="bg-[#1e293b]/50 py-24 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-24 h-24 mx-auto rounded-full border-4 border-amber-500 shadow-2xl overflow-hidden mb-8 bg-white">
            <img 
              src="/developer.jpg" 
              alt="الأستاذ سايج محمد" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Saidj+Mohamed&background=1a3a5c&color=fff&size=128';
              }}
            />
          </div>
          <h3 className="text-3xl font-black mb-2">الأستاذ سايج محمد</h3>
          <p className="text-amber-500 font-bold uppercase tracking-widest mb-6">محامٍ لدى مجلس قضاء الجزائر</p>
          <p className="text-gray-400 leading-relaxed mb-10 font-medium italic">
            "تم تطوير هذه المنصة لتكون رفيقاً رقمياً للمحامي الجزائري، تهدف إلى تبسيط الإجراءات القانونية وضمان الوصول السريع للمعلومة التشريعية والقضائية."
          </p>
          <div className="flex justify-center gap-6 text-sm font-bold">
            <div className="flex flex-col items-center gap-2">
              <span className="text-gray-500 uppercase tracking-tighter">الهاتف</span>
              <span className="text-white">0558357689</span>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="flex flex-col items-center gap-2">
              <span className="text-gray-500 uppercase tracking-tighter">البريد الإلكتروني</span>
              <span className="text-white">SAIDJ.MOHAMED@GMAIL.COM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dedication Section */}
      <div className="py-24 text-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="max-w-2xl mx-auto p-12 rounded-[3rem] bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20"
        >
          <div className="text-4xl mb-6">🕊️</div>
          <h4 className="text-2xl font-black text-amber-500 mb-4">صدقة جارية</h4>
          <p className="text-xl text-gray-300 leading-relaxed font-medium">
            هذا العمل صدقة جارية لروح والدي الغالي <br />
            <span className="text-white text-3xl font-black mt-4 block">سايج عبد النور</span>
            <span className="text-amber-500/60 text-sm block mt-4 italic">رحمه الله وأسكنه فسيح جناته - نسألكم الدعاء له بالرحمة والمغفرة</span>
          </p>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="py-10 border-t border-white/5 text-center text-gray-500 text-xs font-medium">
        <p>© {new Date().getFullYear()} الشامل القانوني - جميع الحقوق محفوظة للأستاذ سايج محمد</p>
      </footer>
    </div>
  );
}
