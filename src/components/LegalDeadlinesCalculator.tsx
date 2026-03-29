'use client';

import { useState, useMemo } from 'react';
import { Calculator, Calendar, AlertCircle, CheckCircle, Info, Clock, Scale, FileText, AlertTriangle } from 'lucide-react';

// الآجال القانونية من ق.إ.م.إ وقانون الإجراءات الجزائية الجديد (25-14)
const deadlinesData = {
  civil: {
    title: 'الآجال المدنية (ق.إ.م.إ)',
    color: 'blue',
    categories: [
      {
        name: 'آجال الطعن العادية',
        items: [
          { name: 'الاستئناف', days: 30, article: 'المادة 444', description: 'من تاريخ التبليغ الرسمي بالحكم', type: 'استئناف' },
          { name: 'المعارضة', days: 30, article: 'المادة 444', description: 'من تاريخ التبليغ الرسمي بالحكم الغيابي', type: 'معارضة' },
        ]
      },
      {
        name: 'آجال الطعن غير العادية',
        items: [
          { name: 'الطعن بالنقض', days: 60, article: 'المادة 456', description: 'من تاريخ التبليغ الرسمي بقرار الاستئناف', type: 'نقض' },
          { name: 'التماس إعادة النظر', days: 60, article: 'المادة 472', description: 'من تاريخ اكتشاف المستند الجديد', type: 'تماس' },
        ]
      },
      {
        name: 'آجال التقادم',
        items: [
          { name: 'تقادم الدعوى المدنية', days: 5475, article: 'المادة 308 ق.م', description: '15 سنة من تاريخ استحقاق الدين', type: 'تقادم' },
          { name: 'تقادم الدعوى التجارية', days: 1825, article: 'المادة 17 ق.ت', description: '5 سنوات', type: 'تقادم' },
          { name: 'تقادم الدعوى العقارية', days: 3650, article: 'المادة 854 ق.م', description: '10 سنوات', type: 'تقادم' },
        ]
      }
    ]
  },
  penal: {
    title: 'الآجال الجزائية (ق.إ.ج 25-14)',
    color: 'red',
    categories: [
      {
        name: 'آجال التوقيف للنظر',
        items: [
          { name: 'التوقيف الأولي', days: 2, article: 'المادة 83', description: '48 ساعة قابلة للتمديد بإذن من وكيل الجمهورية', type: 'توقيف' },
          { name: 'التمديد الأول', days: 4, article: 'المادة 83', description: 'يمكن تمديده مرة واحدة فقط', type: 'توقيف' },
        ]
      },
      {
        name: 'آجال الحبس المؤقت',
        items: [
          { name: 'الحبس المؤقت - الجنح (حالة واحدة)', days: 30, article: 'المادة 202', description: 'شهر واحد غير قابل للتجديد في حالة التعويضات', type: 'حبس' },
          { name: 'الحبس المؤقت - الجنح', days: 120, article: 'المادة 203', description: '4 أشهر + يمكن التمديد مرة واحدة', type: 'حبس' },
          { name: 'الحبس المؤقت - الجنايات', days: 240, article: 'المادة 204', description: '4 أشهر + تمديدين (كل تمديد 4 أشهر)', type: 'حبس' },
          { name: 'الحد الأقصى للجنايات العادية', days: 365, article: 'المادة 204', description: 'سنة واحدة (4+4+4 أشهر)', type: 'حبس' },
          { name: 'الحد الأقصى للجنايات الخطيرة', days: 485, article: 'المادة 204', description: 'سنة و4 أشهر (عقوبة 20 سنة أو أكثر)', type: 'حبس' },
        ]
      },
      {
        name: 'آجال التقادم الجزائي',
        items: [
          { name: 'تقادم الدعوى - المخالفات', days: 730, article: 'المادة 14', description: 'سنتان', type: 'تقادم' },
          { name: 'تقادم الدعوى - الجنح العادية', days: 1825, article: 'المادة 11', description: '5 سنوات', type: 'تقادم' },
          { name: 'تقادم الدعوى - الجنح الخطيرة', days: 3650, article: 'المادة 11', description: '10 سنوات (عقوبة أكثر من 5 سنوات)', type: 'تقادم' },
          { name: 'تقادم الدعوى - الجنايات', days: 5475, article: 'المادة 10', description: '15 سنة', type: 'تقادم' },
          { name: 'تقادم الجرائم الخفية - جنايات', days: 9125, article: 'المادة 15', description: '25 سنة كحد أقصى', type: 'تقادم' },
        ]
      },
      {
        name: 'آجال الطعن الجزائية',
        items: [
          { name: 'استئناف - النيابة العامة', days: 10, article: 'المادة 588', description: '10 أيام من النطق بالحكم (للنيابة العامة)', type: 'استئناف نيابة' },
          { name: 'استئناف - الأطراف (جنح/جنايات)', days: 3, article: 'المادة 588', description: '3 أيام من النطق بالحكم الحضوري (للأطراف)', type: 'استئناف أطراف' },
          { name: 'المعارضة', days: 3, article: 'المادة 588', description: '3 أيام من التبليغ بالحكم الغيابي', type: 'معارضة' },
          { name: 'الطعن بالنقض', days: 8, article: 'المادة 654', description: '8 أيام من النطق بالقرار', type: 'نقض' },
        ]
      }
    ]
  }
};

// معلومات عن القانون الجديد
const lawInfo = {
  penal: {
    number: '25-14',
    date: '2025-08-03',
    journal: '54',
    title: 'قانون الإجراءات الجزائية الجديد'
  },
  civil: {
    number: '08-09',
    date: '2008-02-25',
    journal: '21',
    title: 'قانون الإجراءات المدنية والإدارية'
  }
};

// حساب نهاية الأجل
function calculateDeadline(startDate: Date, days: number): { 
  deadlineDate: Date; 
  isWeekend: boolean; 
  weekendDays: number;
  formattedDate: string;
} {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  
  // التحقق من عطلة نهاية الأسبوع (الجمعة والسبت في الجزائر)
  const dayOfWeek = endDate.getDay();
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // 5 = الجمعة، 6 = السبت
  
  // حساب أيام العطلة الأسبوعية ضمن الأجل
  let weekendDays = 0;
  const tempDate = new Date(startDate);
  for (let i = 0; i < days; i++) {
    tempDate.setDate(tempDate.getDate() + 1);
    if (tempDate.getDay() === 5 || tempDate.getDay() === 6) {
      weekendDays++;
    }
  }
  
  const formattedDate = endDate.toLocaleDateString('ar-DZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return { deadlineDate: endDate, isWeekend, weekendDays, formattedDate };
}

// تنسيق الأجل
function formatDeadline(days: number): string {
  if (days === 2) return '48 ساعة';
  if (days === 4) return '96 ساعة';
  if (days === 3) return '3 أيام';
  if (days === 8) return '8 أيام';
  if (days === 10) return '10 أيام';
  if (days === 30) return 'شهر';
  if (days === 60) return 'شهران';
  if (days === 120) return '4 أشهر';
  if (days === 240) return '8 أشهر';
  if (days === 365) return 'سنة';
  if (days === 485) return 'سنة و4 أشهر';
  if (days >= 365) {
    const years = Math.round(days / 365);
    return `${years} ${years === 1 ? 'سنة' : years === 2 ? 'سنتان' : 'سنوات'}`;
  }
  return `${days} يوم`;
}

export default function LegalDeadlinesCalculator() {
  const [selectedCategory, setSelectedCategory] = useState<'civil' | 'penal'>('penal');
  const [selectedDeadline, setSelectedDeadline] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [result, setResult] = useState<{ 
    deadlineDate: string; 
    daysCount: number;
    isWeekend: boolean;
    weekendDays: number;
  } | null>(null);

  const handleCalculate = () => {
    if (!selectedDeadline || !startDate) return;

    const start = new Date(startDate);
    const { formattedDate, isWeekend, weekendDays } = calculateDeadline(start, selectedDeadline.days);

    setResult({
      deadlineDate: formattedDate,
      daysCount: selectedDeadline.days,
      isWeekend,
      weekendDays
    });
  };

  const resetCalculator = () => {
    setSelectedDeadline(null);
    setStartDate('');
    setResult(null);
  };

  const bgColor = selectedCategory === 'civil' ? 'from-blue-500 to-indigo-600' : 'from-red-500 to-rose-600';
  const borderColor = selectedCategory === 'civil' ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50';

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className={`bg-gradient-to-l ${bgColor} rounded-2xl p-6 text-white`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">حاسبة الآجال القانونية</h3>
            <p className="text-white/80 text-sm">احسب آجال الطعون والتقادم بدقة</p>
          </div>
        </div>

        {/* Law Info Cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-xs text-white/70">ق.إ.م.إ</div>
            <div className="text-sm font-medium">قانون رقم {lawInfo.civil.number}</div>
            <div className="text-xs text-white/60">{lawInfo.civil.date}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-xs text-white/70">ق.إ.ج (جديد)</div>
            <div className="text-sm font-medium">قانون رقم {lawInfo.penal.number}</div>
            <div className="text-xs text-white/60">{lawInfo.penal.date}</div>
          </div>
        </div>
      </div>

      {/* اختيار نوع القانون */}
      <div className="flex gap-2">
        <button
          onClick={() => { setSelectedCategory('civil'); resetCalculator(); }}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            selectedCategory === 'civil'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <FileText className="w-5 h-5" />
          ق.إ.م.إ (مدني)
        </button>
        <button
          onClick={() => { setSelectedCategory('penal'); resetCalculator(); }}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            selectedCategory === 'penal'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Scale className="w-5 h-5" />
          ق.إ.ج 25-14 (جديد)
        </button>
      </div>

      {/* حاسبة سريعة */}
      <div className={`rounded-xl p-5 ${borderColor} border`}>
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          حاسبة الآجال السريعة
        </h4>
        
        {/* اختيار تاريخ التبليغ */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2 font-medium">
            تاريخ التبليغ بالحكم / المنطوق
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          />
        </div>
        
        {/* اختيار نوع الإجراء */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2 font-medium">
            نوع الإجراء
          </label>
          <select
            value={selectedDeadline ? `${selectedDeadline.name}` : ''}
            onChange={(e) => {
              const allItems = deadlinesData[selectedCategory].categories.flatMap(c => c.items);
              const item = allItems.find(i => i.name === e.target.value);
              setSelectedDeadline(item || null);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-white"
          >
            <option value="">اختر نوع الإجراء...</option>
            {deadlinesData[selectedCategory].categories.map((category, catIdx) => (
              <optgroup key={catIdx} label={category.name}>
                {category.items.map((item, itemIdx) => (
                  <option key={itemIdx} value={item.name}>
                    {item.name} ({formatDeadline(item.days)}) - {item.article}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* عرض المعلومات عن الإجراء المختار */}
        {selectedDeadline && (
          <div className={`p-4 rounded-xl mb-4 ${
            selectedCategory === 'civil' ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className={`w-5 h-5 ${selectedCategory === 'civil' ? 'text-blue-600' : 'text-red-600'}`} />
              <span className="font-bold text-gray-800">{selectedDeadline.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">الأجل:</span>
                <span className="font-bold mr-2">{formatDeadline(selectedDeadline.days)}</span>
              </div>
              <div>
                <span className="text-gray-500">المرجع:</span>
                <span className="font-medium mr-2">{selectedDeadline.article}</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">{selectedDeadline.description}</p>
          </div>
        )}

        <button
          onClick={handleCalculate}
          disabled={!startDate || !selectedDeadline}
          className={`w-full py-4 rounded-xl font-medium transition-all text-lg ${
            selectedCategory === 'civil'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Calculator className="w-5 h-5 inline-block ml-2" />
          احسب تاريخ الانتهاء
        </button>
      </div>

      {/* النتيجة */}
      {result && (
        <div className={`p-5 rounded-xl ${
          selectedCategory === 'civil' ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <CheckCircle className={`w-7 h-7 ${
              selectedCategory === 'civil' ? 'text-blue-600' : 'text-red-600'
            } flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <h5 className="font-semibold text-gray-800 mb-2 text-lg">تاريخ انتهاء الأجل</h5>
              <p className="text-xl font-bold text-gray-900">{result.deadlineDate}</p>
              <p className="text-sm text-gray-600 mt-2">
                بعد {formatDeadline(result.daysCount)} من تاريخ التبليغ
              </p>
              
              {/* تحذيرات عطلة نهاية الأسبوع */}
              {result.isWeekend && (
                <div className="mt-3 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">تنبيه: آخر الأجل يصادف عطلة نهاية الأسبوع!</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    يُمدد الأجل لأول يوم عمل (الأحد)
                  </p>
                </div>
              )}
              
              {result.weekendDays > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  ℹ️ يتضمن الأجل {result.weekendDays} يوم/أيام عطلة نهاية الأسبوع
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* عرض الآجال التفصيلي */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          تفاصيل الآجال القانونية
        </h4>
        {deadlinesData[selectedCategory].categories.map((category, catIdx) => (
          <div key={catIdx} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className={`px-4 py-3 ${
              selectedCategory === 'civil' ? 'bg-blue-50' : 'bg-red-50'
            }`}>
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {category.name}
              </h4>
            </div>
            <div className="divide-y divide-gray-100">
              {category.items.map((item, itemIdx) => (
                <button
                  key={itemIdx}
                  onClick={() => {
                    setSelectedDeadline(item);
                    setResult(null);
                  }}
                  className={`w-full p-4 text-right transition-colors ${
                    selectedDeadline === item
                      ? selectedCategory === 'civil' ? 'bg-blue-100' : 'bg-red-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">{item.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          selectedCategory === 'civil' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.article}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    </div>
                    <div className={`text-lg font-bold ${
                      selectedCategory === 'civil' ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {formatDeadline(item.days)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ملاحظة */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-2">ملاحظات مهمة:</p>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>تحسب الآجال بالأيام الكاملة</li>
              <li>لا تُحتسب يوم التبليغ ضمن الأجل</li>
              <li>إذا صادف آخر الأجل يوم عطلة، يُمدد لأول يوم عمل</li>
              <li>العطلة الأسبوعية في الجزائر: الجمعة والسبت</li>
              <li>ق.إ.ج الجديد (25-14) ساري من 03 أوت 2025</li>
              <li>هذه الحاسبة للأغراض التقريبية - راجع النصوص القانونية للتأكد</li>
            </ul>
          </div>
        </div>
      </div>

      {/* معلومة قانونية */}
      <div className="bg-gradient-to-l from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Info className="w-5 h-5" />
          معلومة قانونية
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          {selectedCategory === 'penal' 
            ? 'قانون الإجراءات الجزائية الجديد رقم 25-14 المؤرخ في 9 صفر 1447 الموافق 3 أوت 2025 أحدث تغييرات جوهرية في آجال الحبس المؤقت والتقادم، حيث أصبح الحد الأقصى للحبس المؤقت في الجنايات العادية سنة واحدة، وفي الجنايات الخطيرة (المعاقب عليها بـ 20 سنة أو أكثر) سنة و4 أشهر. كما تم تخفيض آجال الطعن للأطراف إلى 3 أيام فقط.'
            : 'قانون الإجراءات المدنية والإدارية رقم 08-09 ينظم آجال الطعون المدنية، حيث يكون أجل الاستئناف 30 يوماً من تاريخ التبليغ الرسمي بالحكم، وأجل الطعن بالنقض 60 يوماً من تاريخ التبليغ بقرار الاستئناف.'}
        </p>
      </div>
    </div>
  );
}
