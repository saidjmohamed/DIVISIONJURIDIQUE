"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { QIJ_DEADLINES } from "@/data/deadlines-qij"
import { QIMA_DEADLINES } from "@/data/deadlines-qima"
import { ALL_DEADLINES } from "@/data/deadlines-all"
import { Deadline } from "@/data/deadlines-qij"

// Lazy load components
const DeadlinesTable = dynamic(() => import("./DeadlinesTable"), { ssr: false })
const DeadlineCalculator = dynamic(() => import("./DeadlineCalculator"), { ssr: false })

type ViewMode = "table" | "calculator"
type LawFilter = "both" | "qij" | "qima"

export default function DualDeadlineView() {
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [lawFilter, setLawFilter] = useState<LawFilter>("both")

  const getDeadlines = (): Deadline[] => {
    switch (lawFilter) {
      case "qij":
        return QIJ_DEADLINES
      case "qima":
        return QIMA_DEADLINES
      default:
        return ALL_DEADLINES
    }
  }

  const deadlines = getDeadlines()

  return (
    <div className="max-w-6xl mx-auto px-4 py-4" dir="rtl">

      {/* ─── تبديل العرض ─── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">

        {/* القانون */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {[
            { value: "both" as LawFilter, label: "📚 الكل", count: QIJ_DEADLINES.length + QIMA_DEADLINES.length },
            { value: "qij" as LawFilter, label: "⚖️ ق.إ.ج", count: QIJ_DEADLINES.length },
            { value: "qima" as LawFilter, label: "🏛️ ق.إ.م.إ", count: QIMA_DEADLINES.length },
          ].map(opt => (
            <button key={opt.value}
              onClick={() => setLawFilter(opt.value)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2
                ${lawFilter === opt.value
                  ? "bg-white text-[#1a3a5c] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                }`}>
              {opt.label}
              <span className="text-xs opacity-70">({opt.count})</span>
            </button>
          ))}
        </div>

        {/* وضع العرض */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          <button
            onClick={() => setViewMode("table")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
              ${viewMode === "table"
                ? "bg-white text-[#1a3a5c] shadow-sm"
                : "text-gray-500"}`}>
            📋 جدول الآجال
          </button>
          <button
            onClick={() => setViewMode("calculator")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
              ${viewMode === "calculator"
                ? "bg-white text-[#1a3a5c] shadow-sm"
                : "text-gray-500"}`}>
            🧮 الحاسبة
          </button>
        </div>
      </div>

      {/* ─── شريط الإحصاء ─── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-blue-700">
            {QIJ_DEADLINES.length}
          </p>
          <p className="text-xs text-blue-600">أجل ق.إ.ج</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-green-700">
            {QIMA_DEADLINES.length}
          </p>
          <p className="text-xs text-green-600">أجل ق.إ.م.إ</p>
        </div>
        <div className="bg-[#1a3a5c]/10 border border-[#1a3a5c]/20 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-[#1a3a5c]">
            {QIJ_DEADLINES.length + QIMA_DEADLINES.length}
          </p>
          <p className="text-xs text-[#1a3a5c]">أجل قانوني</p>
        </div>
      </div>

      {/* ─── العرض الجنب لجنب على الشاشات الكبيرة ─── */}
      {viewMode === "table" && lawFilter === "both" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ق.إ.ج */}
          <div className="border border-blue-200 rounded-2xl overflow-hidden bg-white">
            <div className="bg-blue-600 text-white p-3 text-center">
              <p className="font-black text-sm">⚖️ آجال ق.إ.ج 25-14</p>
              <p className="text-xs opacity-80">
                قانون الإجراءات الجزائية — {QIJ_DEADLINES.length} أجل
              </p>
            </div>
            <div className="p-3 max-h-[600px] overflow-y-auto">
              <DeadlinesTable deadlines={QIJ_DEADLINES} lawColor="blue" showTitle={false} compact={true} />
            </div>
          </div>
          
          {/* ق.إ.م.إ */}
          <div className="border border-green-200 rounded-2xl overflow-hidden bg-white">
            <div className="bg-green-600 text-white p-3 text-center">
              <p className="font-black text-sm">🏛️ آجال ق.إ.م.إ 08-09</p>
              <p className="text-xs opacity-80">
                قانون الإجراءات المدنية والإدارية — {QIMA_DEADLINES.length} أجل
              </p>
            </div>
            <div className="p-3 max-h-[600px] overflow-y-auto">
              <DeadlinesTable deadlines={QIMA_DEADLINES} lawColor="green" showTitle={false} compact={true} />
            </div>
          </div>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <DeadlinesTable 
            deadlines={deadlines} 
            lawColor={lawFilter === "qij" ? "blue" : lawFilter === "qima" ? "green" : "blue"}
            showTitle={true}
          />
        </div>
      ) : (
        <DeadlineCalculator 
          deadlines={deadlines}
          lawColor={lawFilter === "qij" ? "blue" : lawFilter === "qima" ? "green" : "blue"}
        />
      )}

      {/* ملاحظة */}
      <div className="mt-6 bg-gradient-to-l from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
        <p className="text-sm text-amber-800 text-center">
          💡 استخدم الفلتر لعرض آجال كل قانون على حدة، أو اضغط على "الكل" لعرض الآجالين معاً
        </p>
      </div>
    </div>
  )
}
