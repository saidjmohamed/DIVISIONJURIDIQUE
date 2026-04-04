'use client';
import { useState, useMemo } from 'react';

interface DeadlineType {
  id: string;
  name: string;
  days: number;
  article: string;
  category: string;
}

const deadlines: DeadlineType[] = [
  { id: 'appeal-civil', name: 'استئناف مدني', days: 30, article: 'م.336 ق.إ.م.إ', category: 'مدني' },
  { id: 'appeal-criminal', name: 'استئناف جزائي', days: 10, article: 'م.418 ق.إ.ج', category: 'جزائي' },
  { id: 'cassation-civil', name: 'طعن بالنقض مدني', days: 60, article: 'م.354 ق.إ.م.إ', category: 'مدني' },
  { id: 'cassation-criminal', name: 'طعن بالنقض جزائي', days: 8, article: 'م.498 ق.إ.ج', category: 'جزائي' },
  { id: 'opposition', name: 'معارضة جزائية', days: 10, article: 'م.411 ق.إ.ج', category: 'جزائي' },
  { id: 'investigation-appeal', name: 'اعتراض على أمر قاضي التحقيق', days: 3, article: 'م.170 ق.إ.ج', category: 'جزائي' },
  { id: 'admin-grievance', name: 'تظلم إداري مسبق', days: 60, article: 'م.830 ق.إ.م.إ', category: 'إداري' },
  { id: 'admin-lawsuit', name: 'دعوى إدارية (بعد التظلم)', days: 120, article: 'م.829 ق.إ.م.إ', category: 'إداري' },
  { id: 'execution-issue', name: 'إشكال في التنفيذ', days: 15, article: 'م.631 ق.إ.م.إ', category: 'مدني' },
  { id: 'judge-recusal', name: 'رد القاضي', days: 3, article: 'م.242 ق.إ.م.إ', category: 'مدني' },
  { id: 'appeal-admin', name: 'استئناف إداري', days: 30, article: 'م.950 ق.إ.م.إ', category: 'إداري' },
  { id: 'labor-appeal', name: 'استئناف عمالي', days: 30, article: 'م.336 ق.إ.م.إ', category: 'اجتماعي' },
];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  // Skip Friday/Saturday (Algerian weekend)
  while (result.getDay() === 5 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function DeadlineCalculatorTool({ onBack }: { onBack: () => void }) {
  const [selectedDeadline, setSelectedDeadline] = useState('');
  const [startDate, setStartDate] = useState('');

  const result = useMemo(() => {
    if (!selectedDeadline || !startDate) return null;
    const dl = deadlines.find(d => d.id === selectedDeadline);
    if (!dl) return null;
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return null;
    const end = addDays(start, dl.days);
    const remaining = daysUntil(end);
    return { deadline: dl, start, end, remaining };
  }, [selectedDeadline, startDate]);

  const urgencyColor = result ? (result.remaining <= 3 ? 'text-red-600 bg-red-50 border-red-200' : result.remaining <= 7 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 'text-green-600 bg-green-50 border-green-200') : '';

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">⏰ حاسبة الآجال القضائية</h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-700 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الأجل</label>
          <select value={selectedDeadline} onChange={e => setSelectedDeadline(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200">
            <option value="">اختر نوع الأجل...</option>
            {deadlines.map(dl => (
              <option key={dl.id} value={dl.id}>{dl.name} ({dl.days} يوم) — {dl.article}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ التبليغ / صدور الحكم</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200" />
        </div>
      </div>

      {result && (
        <div className={`rounded-xl p-4 mb-4 border ${urgencyColor} dark:bg-gray-800 dark:border-gray-700`}>
          <div className="text-center space-y-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">{result.deadline.name}</div>
            <div className="text-2xl font-bold">{formatDate(result.end)}</div>
            <div className={`text-lg font-bold ${result.remaining <= 3 ? 'text-red-600' : result.remaining <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>
              {result.remaining > 0 ? `${result.remaining} يوم متبقي` : result.remaining === 0 ? 'اليوم آخر أجل!' : `⚠️ انتهى الأجل منذ ${Math.abs(result.remaining)} يوم`}
            </div>
            <div className="text-xs text-gray-400">{result.deadline.article} — المدة: {result.deadline.days} يوم</div>
            <div className="text-[10px] text-gray-400">* يتم تجاوز أيام العطل (الجمعة والسبت)</div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">جدول الآجال المرجعي</h3>
        <div className="space-y-1">
          {deadlines.map(dl => (
            <div key={dl.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <span className="text-gray-700 dark:text-gray-300">{dl.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1a3a5c] dark:text-[#f0c040]">{dl.days} يوم</span>
                <span className="text-gray-400">{dl.article}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
