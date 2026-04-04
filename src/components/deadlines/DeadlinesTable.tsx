"use client"

import { useState, useMemo } from "react"
import { QIJ_DEADLINES, DEADLINE_CATEGORIES, Deadline } from "@/data/deadlines-qij"
import { formatDuration, formatStartFrom } from "@/lib/deadline-calculator"
import { Clock, Search, BookOpen, ChevronDown, ChevronUp, Calendar } from "lucide-react"

type Props = {
  deadlines?: Deadline[]
  lawColor?: "blue" | "green"
  showTitle?: boolean
  compact?: boolean
}

export default function DeadlinesTable({ 
  deadlines = QIJ_DEADLINES, 
  lawColor = "blue",
  showTitle = true,
  compact = false
}: Props) {
  const [activeCategory, setActiveCategory] = useState("all")
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const colorClasses = {
    blue: {
      primary: "bg-blue-600",
      text: "text-blue-700",
      bg: "bg-blue-100",
      border: "border-blue-200",
    },
    green: {
      primary: "bg-green-600",
      text: "text-green-700",
      bg: "bg-green-100",
      border: "border-green-200",
    }
  }

  const colors = colorClasses[lawColor]

  const filtered = useMemo(() => {
    let list = deadlines
    if (activeCategory !== "all") {
      list = list.filter(d => d.category === activeCategory)
    }
    if (search.trim()) {
      const query = search.toLowerCase()
      list = list.filter(d =>
        d.title.toLowerCase().includes(query) ||
        d.article.includes(search) ||
        d.description.toLowerCase().includes(query)
      )
    }
    return list
  }, [activeCategory, search, deadlines])

  // تجميع حسب الفئة للعرض
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Deadline[]> = {}
    filtered.forEach(d => {
      if (!groups[d.category]) groups[d.category] = []
      groups[d.category].push(d)
    })
    return groups
  }, [filtered])

  const getCategoryLabel = (cat: string) => {
    const found = DEADLINE_CATEGORIES.find(c => c.value === cat)
    return found ? found.label : cat
  }

  // تحديد لون البادج حسب القانون
  const getLawBadge = (law: string) => {
    if (law === "25-14") {
      return (
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          ق.إ.ج
        </span>
      )
    }
    return (
      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
        ق.إ.م.إ
      </span>
    )
  }

  // تحديد لون بادج المادة
  const articleBgClass = lawColor === "green" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"

  const lawTitle = deadlines[0]?.law === "25-14" ? "ق.إ.ج 25-14" : "ق.إ.م.إ 08-09"
  const lawName = deadlines[0]?.law === "25-14" ? "قانون الإجراءات الجزائية" : "قانون الإجراءات المدنية والإدارية"

  return (
    <div className={compact ? "" : "max-w-3xl mx-auto space-y-5"} dir="rtl">
      {/* العنوان */}
      {showTitle && (
        <div className={`text-center bg-gradient-to-l ${colors.primary} rounded-t-2xl p-4 text-white`}>
          <span className="text-3xl block mb-1">📅</span>
          <h2 className="text-lg font-bold">
            جدول الآجال القانونية
          </h2>
          <p className="text-xs text-white/80 mt-1">
            {lawTitle} — {deadlines.length} أجل قانوني
          </p>
        </div>
      )}

      {/* البحث */}
      {!compact && (
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث عن أجل أو رقم مادة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 bg-white"
          />
        </div>
      )}

      {/* تصفية حسب الفئة */}
      {!compact && (
        <div className="flex gap-2 flex-wrap">
          {DEADLINE_CATEGORIES.map(cat => {
            const count = deadlines.filter(d => cat.value === "all" || d.category === cat.value).length
            if (count === 0) return null
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeCategory === cat.value
                    ? `${colors.primary} text-white shadow-lg`
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            )
          })}
        </div>
      )}

      {/* الإحصائيات */}
      {!compact && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className={`text-2xl font-black ${colors.text}`}>{deadlines.length}</p>
              <p className="text-xs text-gray-500">إجمالي الآجال</p>
            </div>
            <div>
              <p className="text-2xl font-black text-blue-600">{filtered.length}</p>
              <p className="text-xs text-gray-500">نتيجة البحث</p>
            </div>
            <div>
              <p className="text-2xl font-black text-amber-600">{DEADLINE_CATEGORIES.length - 1}</p>
              <p className="text-xs text-gray-500">تصنيفات</p>
            </div>
            <div>
              <p className={`text-2xl font-black ${colors.text}`}>{deadlines[0]?.law || "-"}</p>
              <p className="text-xs text-gray-500">{lawTitle.split(' ')[0]}</p>
            </div>
          </div>
        </div>
      )}

      {/* قائمة الآجال */}
      {activeCategory === "all" && !compact ? (
        // عرض مجموعات
        <div className="space-y-4">
          {Object.entries(groupedByCategory).map(([category, categoryDeadlines]) => (
            <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <BookOpen className={`w-4 h-4 ${colors.text}`} />
                  {getCategoryLabel(category)}
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                    {categoryDeadlines.length}
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {categoryDeadlines.map(d => (
                  <DeadlineItem 
                    key={d.id} 
                    deadline={d} 
                    isExpanded={expandedId === d.id}
                    onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                    lawColor={lawColor}
                    getLawBadge={getLawBadge}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // عرض قائمة بسيطة
        <div className={compact ? "space-y-1" : "space-y-2"}>
          {filtered.map(d => (
            <DeadlineItem 
              key={d.id} 
              deadline={d} 
              isExpanded={expandedId === d.id}
              onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
              lawColor={lawColor}
              getLawBadge={getLawBadge}
              compact={compact}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد نتائج مطابقة</p>
        </div>
      )}
    </div>
  )
}

// مكون عنصر الأجل
function DeadlineItem({ 
  deadline, 
  isExpanded, 
  onToggle,
  lawColor,
  getLawBadge,
  compact = false
}: { 
  deadline: Deadline
  isExpanded: boolean
  onToggle: () => void
  lawColor: "blue" | "green"
  getLawBadge: (law: string) => React.JSX.Element
  compact?: boolean
}) {
  const primaryColor = lawColor === "green" ? "bg-green-600" : "bg-[#1a3a5c]"
  const articleBgClass = lawColor === "green" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"

  return (
    <div 
      className={`bg-white rounded-xl overflow-hidden transition-all ${
        isExpanded ? 'shadow-md border-2 border-gray-300' : compact ? '' : 'shadow-sm border border-gray-100'
      }`}
    >
      <button
        onClick={onToggle}
        className={`w-full ${compact ? 'p-2' : 'p-4'} text-right hover:bg-gray-50 transition-colors`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`font-bold text-gray-800 ${compact ? 'text-xs' : ''}`}>{deadline.title}</p>
              <span className={`text-xs ${articleBgClass} px-2 py-0.5 rounded-full`}>
                م {deadline.article}
              </span>
              {deadline.extensible && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  قابل للتمديد
                </span>
              )}
            </div>
            <p className={`text-xs text-gray-500 mt-1 ${compact ? 'line-clamp-1' : 'line-clamp-1'}`}>{deadline.description}</p>
          </div>
          <div className="shrink-0 text-center min-w-[70px]">
            <div className={`${primaryColor} text-white rounded-xl p-2 text-center`}>
              <p className="text-lg font-black">{deadline.duration}</p>
              <p className="text-xs">{deadline.unit}</p>
            </div>
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50">
          <div className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">المدة:</span>
                <span className="font-bold mr-1">{formatDuration(deadline.duration, deadline.unit)}</span>
              </div>
              <div>
                <span className="text-gray-500">بداية الأجل:</span>
                <span className="font-medium mr-1">{formatStartFrom(deadline.startFrom)}</span>
              </div>
              <div>
                <span className="text-gray-500">المادة:</span>
                <span className="font-medium mr-1">{deadline.article}</span>
              </div>
              <div>
                <span className="text-gray-500">النوع:</span>
                <span className="font-medium mr-1">
                  {deadline.isCalendaire ? "أيام تقويمية" : "أيام كاملة"}
                </span>
              </div>
            </div>
            
            <p className="text-sm text-gray-700">{deadline.description}</p>
            
            {deadline.extensible && deadline.extensionDetails && (
              <div className={`rounded-lg p-3 ${lawColor === 'green' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`text-xs font-bold mb-1 ${lawColor === 'green' ? 'text-green-800' : 'text-blue-800'}`}>🔄 إمكانية التمديد:</p>
                <p className={`text-xs ${lawColor === 'green' ? 'text-green-700' : 'text-blue-700'}`}>{deadline.extensionDetails}</p>
              </div>
            )}
            
            {deadline.conditions && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-bold text-amber-800 mb-1">📌 شروط وملاحظات:</p>
                <p className="text-xs text-amber-700">{deadline.conditions}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
