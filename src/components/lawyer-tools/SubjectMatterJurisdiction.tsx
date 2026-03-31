'use client';

import { useState } from 'react';
import { getSubjectMatterJurisdiction, JurisdictionResult } from '@/lib/legal-rules';

const CASE_TYPES = [
  { id: 'عقاري', label: 'منازعات عقارية', icon: '🏠' },
  { id: 'تجاري', label: 'منازعات تجارية', icon: '💼' },
  { id: 'شؤون_أسرة', label: 'شؤون الأسرة', icon: '👨‍👩‍👧' },
  { id: 'اجتماعي', label: 'منازعات العمل والضمان الاجتماعي', icon: '👷' },
  { id: 'إداري', label: 'منازعات إدارية (ضد الإدارة)', icon: '🏛️' },
  { id: 'استعجالي', label: 'قضايا استعجالية', icon: '⚡' },
  { id: 'مدني', label: 'منازعات مدنية أخرى', icon: '📜' },
];

export default function SubjectMatterJurisdiction({ onBack }: { onBack: () => void }) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [result, setResult] = useState<JurisdictionResult | null>(null);

  const handleCheck = (id: string) => {
    setSelectedType(id);
    setResult(getSubjectMatterJurisdiction(id));
  };

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">🏛️ تحديد الاختصاص النوعي</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
        اختر نوع النزاع لتحديد القسم المختص والتشكيل القانوني وفق قانون الإجراءات المدنية والإدارية.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {CASE_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => handleCheck(type.id)}
            className={`p-4 rounded-xl border text-right transition-all ${
              selectedType === type.id
                ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-[#1a3a5c]/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{type.icon}</span>
              <span className="text-sm font-bold">{type.label}</span>
            </div>
          </button>
        ))}
      </div>

      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#1a3a5c]/20 shadow-lg overflow-hidden animate-fade-in">
          <div className="bg-[#1a3a5c] p-4 text-white">
            <h3 className="font-bold text-sm">النتيجة القانونية</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-3">
              <span className="text-xs text-gray-500">القسم المختص:</span>
              <span className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040]">{result.section}</span>
            </div>
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-3">
              <span className="text-xs text-gray-500">تشكيل الجهة:</span>
              <span className="text-sm font-bold">{result.formation}</span>
            </div>
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-3">
              <span className="text-xs text-gray-500">السند القانوني:</span>
              <span className="text-sm font-mono text-blue-600 dark:text-blue-400">{result.legalBasis}</span>
            </div>
            <div className="pt-2">
              <span className="text-xs text-gray-500 block mb-2">شرح إضافي:</span>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                {result.description}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
          ⚠️ ملاحظة: هذا التحديد مبني على القواعد العامة للاختصاص النوعي. قد توجد استثناءات بناءً على قوانين خاصة أو طبيعة أطراف النزاع (مثل الدولة أو الهيئات العمومية).
        </p>
      </div>
    </div>
  );
}
