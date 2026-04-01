'use client';

import { useState } from 'react';

export default function DeveloperInfo() {
  const [isOpen, setIsOpen] = useState(false);

  const socialLinks = [
    {
      name: 'واتساب',
      icon: '📱',
      url: 'https://wa.me/213558357689',
      color: 'bg-[#25D366]'
    },
    {
      name: 'فيسبوك',
      icon: '📘',
      url: 'https://facebook.com/Mtr.saidj.mohamed',
      color: 'bg-[#1877F2]'
    },
    {
      name: 'بريد إلكتروني',
      icon: '📧',
      url: 'mailto:SAIDJ.MOHAMED@GMAIL.COM',
      color: 'bg-[#EA4335]'
    }
  ];

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 transition-transform border-4 border-white dark:border-[#0f172a]"
        title="حول المطور والتطبيق"
      >
        👨‍⚖️
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 left-4 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors z-10"
            >
              ✕
            </button>

            {/* Header with Image */}
            <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2c5282] p-8 text-center relative">
              <div className="w-24 h-24 mx-auto rounded-full border-4 border-[#f0c040] shadow-xl overflow-hidden mb-4 bg-white">
                <img 
                  src="/developer.jpg" 
                  alt="الأستاذ سايج محمد" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Saidj+Mohamed&background=1a3a5c&color=fff&size=128';
                  }}
                />
              </div>
              <h3 className="text-xl font-black text-white mb-1">الأستاذ سايج محمد <span className="text-xs font-bold text-amber-400">(أبو جواد)</span></h3>
              <p className="text-[#f0c040] text-xs font-bold uppercase tracking-widest">محامٍ لدى مجلس قضاء الجزائر</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  محامٍ جزائري وباحث في مجال الذكاء الاصطناعي، يهدف إلى إيجاد حلول رقمية وتسهيل التقاضي الإلكتروني من خلال منصة "الشامل".
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-[#1a3a5c] dark:text-[#f0c040] uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">عن المنصة</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  منصة "الشامل" هي مرجع قانوني رقمي متكامل يجمع بين القوانين الجزائرية المحدثة، حاسبة الآجال القضائية، ونظام تحديد الاختصاص الإقليمي والنوعي، لخدمة أسرة الدفاع والمواطن.
                </p>
              </div>

              {/* Social Icons Only */}
              <div className="flex justify-center gap-6 py-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${link.color} w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-black/10 text-white hover:scale-110 transition-transform`}
                    title={link.name}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>

              <div className="text-center pt-4">
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  الإصدار 3.0 — تم التحديث في أبريل 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
