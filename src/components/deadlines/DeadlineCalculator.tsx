"use client"

import { useState, useMemo } from "react"
import { QIJ_DEADLINES, DEADLINE_CATEGORIES, Deadline } from "@/data/deadlines-qij"
import { ALL_DEADLINES } from "@/data/deadlines-all"
import {
  calculateDeadline,
  formatDate,
  formatDuration,
  formatStartFrom,
  getDeadlinesByCategory,
  searchDeadlines,
  CalculationResult,
} from "@/lib/deadline-calculator"
import { Calculator, Calendar, Clock, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp, Copy, RefreshCw, BookOpen } from "lucide-react"

type Props = {
  deadlines?: Deadline[]
  lawColor?: "blue" | "green"
  showTitle?: boolean
}

export default function DeadlineCalculator({ 
  deadlines = ALL_DEADLINES,
  lawColor = "blue",
  showTitle = true
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showDetails, setShowDetails] = useState(false)

  const colorClasses = {
    blue: {
      primary: "bg-[#1a3a5c]",
      gradient: "from-[#1a3a5c] to-[#2d5a8a]",
      text: "text-blue-700",
      bg: "bg-blue-100",
      border: "border-blue-300",
    },
    green: {
      primary: "bg-green-600",
      gradient: "from-green-600 to-green-700",
      text: "text-green-700",
      bg: "bg-green-100",
      border: "border-green-300",
    }
  }

  const colors = colorClasses[lawColor]

  // الآجال المفلترة
  const filteredDeadlines = useMemo(() => {
    let list = getDeadlinesByCategory(deadlines, selectedCategory)
    if (searchQuery.trim()) {
      list = searchDeadlines(list, searchQuery)
    }
    return list
  }, [selectedCategory, searchQuery, deadlines])

  const selectedDeadline = deadlines.find(d => d.id === selectedDeadlineId)

  // حساب الأجل
  const handleCalculate = () => {
    if (!selectedDeadline || !startDate) return
    const calcResult = calculateDeadline(selectedDeadline, new Date(startDate))
    setResult(calcResult)
  }

  // إعادة تعيين
  const handleReset = () => {
    setSelectedDeadlineId(null)
    setResult(null)
    setStartDate(new Date().toISOString().split('T')[0])
  }

  // نسخ النتيجة
  const handleCopy = () => {
    if (!result || !selectedDeadline) return
    const lawName = selectedDeadline.law === "25-14" ? "ق.إ.ج 25-14" : "ق.إ.م.إ 08-09"
    const text = `
الإجراء: ${selectedDeadline.title}
المادة: ${selectedDeadline.article} ${lawName}
تاريخ البداية: ${formatDate(result.startDate)}
آخر أجل: ${formatDate(result.endDate)}
المدة: ${result.durationDays} يوماً (${result.workingDays} يوم عمل)
    `.trim()
    navigator.clipboard.writeText(text)
  }

  // تحديد لون بادج القانون
  const getLawBadge = (law: string) => {
    if (law === "25-14") {
      return (
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
          ⚖️ ق.إ.ج
        </span>
      )
    }
    return (
      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
        🏛️ ق.إ.م.إ
      </span>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5" dir="rtl">

      {/* العنوان */}
      {showTitle && (
        <div className={`text-center bg-gradient-to-l ${colors.gradient} rounded-2xl p-6 text-white`}>
          <span className="text-5xl block mb-2">🧮</span>
          <h2 className="text-2xl font-bold">
            حاسبة الآجال القانونية
          </h2>
          <p className="text-sm text-white/80 mt-1">
            مع العطل الرسمية الجزائرية
          </p>
          <div className="mt-4 flex justify-center gap-4 text-xs">
            <div className="bg-white/10 rounded-lg px-3 py-2">
              <span className="font-bold">{deadlines.length}</span> أجل قانوني
            </div>
          </div>
        </div>
      )}

      {/* ① اختيار الفئة */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span className={`w-6 h-6 ${colors.primary} text-white rounded-full flex items-center justify-center text-xs`}>1</span>
          اختر نوع الإجراء
        </p>
        <div className="flex gap-2 flex-wrap">
          {DEADLINE_CATEGORIES.map(cat => {
            const count = deadlines.filter(d => cat.value === "all" || d.category === cat.value).length
            if (count === 0) return null
            return (
              <button 
                key={cat.value}
                onClick={() => {
                  setSelectedCategory(cat.value)
                  setSelectedDeadlineId(null)
                  setResult(null)
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedCategory === cat.value
                    ? `${colors.primary} text-white shadow-lg`
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ② اختيار الأجل */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span className={`w-6 h-6 ${colors.primary} text-white rounded-full flex items-center justify-center text-xs`}>2</span>
          اختر الأجل
        </p>
        <input
          type="text"
          placeholder="🔍 ابحث باسم الأجل أو رقم المادة..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-xl text-sm mb-3 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
        />
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filteredDeadlines.map(d => (
            <button 
              key={d.id}
              onClick={() => {
                setSelectedDeadlineId(d.id)
                setResult(null)
              }}
              className={`w-full p-3 rounded-xl text-right transition-all border-2 ${
                selectedDeadlineId === d.id
                  ? "border-gray-400 bg-gray-50"
                  : "border-gray-100 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-800 text-sm">
                      {d.title}
                    </p>
                    {getLawBadge(d.law)}
                    <span className={`text-xs ${d.law === '08-09' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'} px-2 py-0.5 rounded-full`}>
                      م {d.article}
                    </span>
                    {d.extensible && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        🔄 قابل للتمديد
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {d.description}
                  </p>
                </div>
                <div className="shrink-0 text-center min-w-[70px]">
                  <span className="text-sm font-black text-gray-800 block">
                    {formatDuration(d.duration, d.unit)}
                  </span>
                </div>
              </div>
            </button>
          ))}
          {filteredDeadlines.length === 0 && (
            <p className="text-center text-gray-400 py-6 text-sm">
              لا توجد نتائج
            </p>
          )}
        </div>
      </div>

      {/* ③ تاريخ البداية */}
      {selectedDeadline && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className={`w-6 h-6 ${colors.primary} text-white rounded-full flex items-center justify-center text-xs`}>3</span>
            تاريخ البداية
            <span className="text-xs text-gray-400 font-normal mr-2">
              ({formatStartFrom(selectedDeadline.startFrom)})
            </span>
          </p>
          <input
            type="date"
            value={startDate}
            onChange={e => {
              setStartDate(e.target.value)
              setResult(null)
            }}
            className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
          />
          
          {/* معلومات الأجل المختار */}
          <div className="mt-3 p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {getLawBadge(selectedDeadline.law)}
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="font-bold text-gray-800 text-sm">{selectedDeadline.title}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">الأجل:</span>
                <span className="font-bold mr-1">{formatDuration(selectedDeadline.duration, selectedDeadline.unit)}</span>
              </div>
              <div>
                <span className="text-gray-500">المرجع:</span>
                <span className="font-medium mr-1">م {selectedDeadline.article}</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">{selectedDeadline.description}</p>
            {selectedDeadline.extensible && selectedDeadline.extensionDetails && (
              <p className="text-xs text-blue-600 mt-2">🔄 {selectedDeadline.extensionDetails}</p>
            )}
            {selectedDeadline.conditions && (
              <p className="text-xs text-amber-700 mt-2">📌 {selectedDeadline.conditions}</p>
            )}
          </div>
        </div>
      )}

      {/* زر الحساب */}
      {selectedDeadline && startDate && (
        <button
          onClick={handleCalculate}
          className={`w-full py-4 bg-gradient-to-l ${colors.gradient} text-white rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2`}
        >
          <Calculator className="w-5 h-5" />
          احسب الأجل
        </button>
      )}

      {/* نتيجة الحساب */}
      {result && selectedDeadline && (
        <div className={`rounded-2xl p-5 border-2 ${
          result.isUrgent
            ? "bg-red-50 border-red-400"
            : "bg-green-50 border-green-300"
        }`}>
          
          {/* تاريخ الانتهاء */}
          <div className="text-center mb-4">
            <p className="text-sm text-gray-500">آخر أجل للتصرف</p>
            <p className={`text-2xl font-black mt-1 ${
              result.isUrgent ? "text-red-700" : "text-green-700"
            }`}>
              {formatDate(result.endDate)}
            </p>
            {result.isUrgent && (
              <span className="inline-block mt-2 bg-red-500 text-white text-xs px-3 py-1 rounded-full animate-pulse">
                ⚠️ أجل عاجل!
              </span>
            )}
          </div>

          {/* إحصائيات */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-black text-gray-800">{result.durationDays}</p>
              <p className="text-xs text-gray-500">يوم إجمالي</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-black text-blue-600">{result.workingDays}</p>
              <p className="text-xs text-gray-500">يوم عمل</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-black text-amber-600">{result.holidaysInPeriod.length + result.weekendsInPeriod}</p>
              <p className="text-xs text-gray-500">يوم راحة</p>
            </div>
          </div>

          {/* تحذير */}
          {result.warning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              {result.warning}
            </div>
          )}

          {/* العطل داخل الأجل */}
          {result.holidaysInPeriod.length > 0 && (
            <div className="bg-white rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-gray-700 mb-2">
                العطل الرسمية داخل الأجل:
              </p>
              <div className="flex flex-wrap gap-1">
                {result.holidaysInPeriod.map(h => (
                  <span key={h} className="inline-block bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                    📅 {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* تفاصيل الحساب */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full bg-white rounded-xl p-3 mb-4 flex items-center justify-between text-right"
          >
            <span className="text-xs font-bold text-gray-700 flex items-center gap-2">
              <Info className="w-4 h-4" />
              تفاصيل الحساب
            </span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showDetails && (
            <div className="bg-white rounded-xl p-3 mb-4">
              <div className="space-y-1">
                {result.steps.map((step, i) => (
                  <p key={i} className="text-xs text-gray-600">{step}</p>
                ))}
              </div>
            </div>
          )}

          {/* أزرار */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              نسخ
            </button>
            <button
              onClick={handleReset}
              className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              جديد
            </button>
          </div>
        </div>
      )}

      {/* ملاحظة */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-bold mb-1">ملاحظات مهمة:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>الأيام الكاملة لا تُحتسب فيها الجمعة والسبت والعطل الرسمية</li>
              <li>الأيام التقويمية تُحتسب بالتقويم بما فيها العطل</li>
              <li>إذا صادف آخر الأجل عطلة، يُمدد لأول يوم عمل</li>
              <li>هذه الحاسبة للأغراض التقريبية — راجع النصوص القانونية</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
