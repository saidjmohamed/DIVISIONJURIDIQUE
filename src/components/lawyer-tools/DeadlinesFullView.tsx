'use client';

import DeadlineCalculator from '@/components/deadlines/DeadlineCalculator';
import DeadlinesTable from '@/components/deadlines/DeadlinesTable';
import DualDeadlineView from '@/components/deadlines/DualDeadlineView';

export default function DeadlinesFullView({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4" dir="rtl">
      {/* Back Button & Title */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-[#1a3a5c] dark:text-[#f0c040] text-lg hover:scale-110 transition-transform"
        >
          →
        </button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">📅 الآجال القضائية</h2>
      </div>

      {/* Calculator + Dual View */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <DeadlineCalculator />
        <DualDeadlineView />
      </div>

      {/* Deadlines Reference Table */}
      <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
        <h4 className="text-base sm:text-xl font-bold text-[#1a3a5c] dark:text-white mb-4 text-center">
          جدول الآجال الشائع
        </h4>
        <div className="overflow-x-auto -mx-3 px-3">
          <DeadlinesTable />
        </div>
      </div>
    </div>
  );
}
