'use client';

import { useState } from 'react';

const platforms = [
  {
    title: 'منصة التقاضي الإلكتروني',
    desc: 'خاصة بالسادة المحامين',
    url: 'https://tadjrib.mjustice.dz/login.php',
    icon: '💻',
    bgColor: 'bg-blue-100',
    hoverColor: 'group-hover:text-blue-500',
  },
  {
    title: 'سحب الأحكام الإلكترونية',
    desc: 'من طرف السادة المحامين',
    url: 'https://ejugement.mjustice.dz/login',
    icon: '📋',
    bgColor: 'bg-green-100',
    hoverColor: 'group-hover:text-green-500',
  },
  {
    title: 'شهادات عدم المعارضة',
    desc: 'عدم الاستئناف وعدم الطعن بالنقض',
    url: 'https://cert-nonrecours.mjustice.dz/',
    icon: '📑',
    bgColor: 'bg-purple-100',
    hoverColor: 'group-hover:text-purple-500',
  },
  {
    title: 'صحيفة السوابق العدلية',
    desc: 'طلب صحيفة السوابق القضائية',
    url: 'https://www.mjustice.gov.dz/ar/%d8%b5%d9%80%d8%ad%d9%8a%d9%81%d8%a9%d8%a7%d9%84%d8%b3%d9%88%d8%a7%d8%a8%d9%82-%d8%a7%d9%84%d9%82%d8%b6%d8%a7%d8%a6%d9%8a%d8%a9/',
    icon: '📜',
    bgColor: 'bg-amber-100',
    hoverColor: 'group-hover:text-amber-500',
  },
  {
    title: 'رخصة الاتصال',
    desc: 'طلب الحصول على رخصة الاتصال',
    url: 'https://ziyarati.mjustice.dz/',
    icon: '🎫',
    bgColor: 'bg-teal-100',
    hoverColor: 'group-hover:text-teal-500',
  },
];

const officialLinks = [
  { title: 'بوابة وزارة العدل', url: 'https://www.mjustice.dz', icon: '🏛️' },
  { title: 'الجريدة الرسمية', url: 'https://www.joradp.dz', icon: '📰' },
];

export default function ElectronicLitigationTab() {
  const [activeSection, setActiveSection] = useState<'platforms' | 'official'>('platforms');

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4" dir="rtl">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveSection('platforms')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
            activeSection === 'platforms'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          🏛️ منصات التقاضي
        </button>
        <button
          onClick={() => setActiveSection('official')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
            activeSection === 'official'
              ? 'bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] shadow-lg'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          🌐 مواقع رسمية
        </button>
      </div>

      {activeSection === 'platforms' ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-blue-100 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🏛️</span>
            <h3 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">منصات وزارة العدل الإلكترونية</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">خدمات رقمية للمحامين والمواطنين</p>

          <div className="space-y-3">
            {platforms.map((p) => (
              <a
                key={p.url}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 group"
              >
                <span className="flex items-center gap-3">
                  <span className={`w-10 h-10 ${p.bgColor} dark:bg-gray-700 rounded-lg flex items-center justify-center text-lg`}>
                    {p.icon}
                  </span>
                  <div>
                    <span className="text-gray-800 dark:text-white font-semibold block text-sm">{p.title}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">{p.desc}</span>
                  </div>
                </span>
                <span className={`text-gray-300 dark:text-gray-600 ${p.hoverColor} transition-colors text-xl`}>←</span>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <h3 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-5 flex items-center gap-2">
            🌐 مواقع رسمية
          </h3>
          <div className="space-y-3">
            {officialLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
              >
                <span className="flex items-center gap-3">
                  <span className="text-lg">{link.icon}</span>
                  <span className="text-gray-700 dark:text-gray-200 font-medium">{link.title}</span>
                </span>
                <span className="text-gray-400 group-hover:text-blue-500 transition-colors text-xl">←</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
          💡 جميع هذه المنصات تابعة لوزارة العدل الجزائرية
        </p>
      </div>
    </div>
  );
}
