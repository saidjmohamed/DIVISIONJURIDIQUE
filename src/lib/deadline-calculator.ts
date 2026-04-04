// /lib/deadline-calculator.ts
import { Deadline, ALGERIA_HOLIDAYS_2025_2026 } from "@/data/deadlines-qij"

export type CalculationResult = {
  startDate: Date
  endDate: Date
  durationDays: number        // المدة بالأيام
  workingDays: number         // أيام العمل فقط
  holidaysInPeriod: string[]  // العطل الواقعة في الأجل
  weekendsInPeriod: number    // عدد عطل الأسبوع
  isUrgent: boolean           // الأجل أقل من 3 أيام؟
  warning: string | null      // تحذير خاص
  steps: string[]             // خطوات الحساب مفصّلة
}

// هل اليوم عطلة رسمية؟
export function isHoliday(date: Date): boolean {
  // Use local date parts instead of toISOString() which converts to UTC
  // Algeria is UTC+1, so toISOString() gives wrong date for first 23 hours of the day
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  return ALGERIA_HOLIDAYS_2025_2026.includes(dateStr);
}

// هل اليوم نهاية أسبوع (جمعة أو سبت)؟
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 5 || day === 6 // 5=جمعة 6=سبت
}

// هل اليوم يوم راحة (عطلة أو نهاية أسبوع)؟
export function isRestDay(date: Date): boolean {
  return isWeekend(date) || isHoliday(date)
}

// إضافة أيام مع تجاوز العطل (للأجال الكاملة فقط)
export function addWorkingDays(startDate: Date, days: number): Date {
  let current = new Date(startDate)
  let added = 0
  while (added < days) {
    current.setDate(current.getDate() + 1)
    if (!isRestDay(current)) added++
  }
  return current
}

// تنسيق التاريخ بالعربية
export function formatDate(date: Date): string {
  return date.toLocaleDateString("ar-DZ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// تنسيق التاريخ المختصر
export function formatDateShort(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// الدالة الرئيسية لحساب الأجل
export function calculateDeadline(
  deadline: Deadline,
  startDate: Date
): CalculationResult {
  const steps: string[] = []
  let endDate: Date
  let totalMs: number

  steps.push(`📅 تاريخ البداية: ${formatDate(startDate)}`)
  steps.push(`📋 الأجل: ${deadline.duration} ${deadline.unit} — المادة ${deadline.article} ق.إ.ج`)

  // حساب تاريخ النهاية حسب وحدة الأجل
  const start = new Date(startDate)

  if (deadline.unit === "ساعة") {
    endDate = new Date(start.getTime() + deadline.duration * 60 * 60 * 1000)
    steps.push(`⏰ الحساب: ${deadline.duration} ساعة من اللحظة ذاتها`)

  } else if (deadline.unit === "يوم") {
    if (deadline.isCalendaire) {
      // أيام تقويمية: تُحسب بالتقويم بما فيها العطل
      endDate = new Date(start)
      endDate.setDate(endDate.getDate() + deadline.duration)
      steps.push(`📆 أيام تقويمية (تشمل العطل والأيام الرسمية)`)
    } else {
      // أيام كاملة: لا تُحسب العطل والجمعة والسبت
      endDate = addWorkingDays(start, deadline.duration)
      steps.push(`🗓️ أيام كاملة (تُستثنى العطل وأيام الجمعة والسبت)`)
    }

  } else if (deadline.unit === "شهر") {
    endDate = new Date(start)
    endDate.setMonth(endDate.getMonth() + deadline.duration)
    steps.push(`📅 ${deadline.duration} شهر بالتقويم الميلادي`)

  } else { // سنة
    endDate = new Date(start)
    endDate.setFullYear(endDate.getFullYear() + deadline.duration)
    steps.push(`📅 ${deadline.duration} سنة بالتقويم الميلادي`)
  }

  // إذا وقع آخر يوم في عطلة → ينقل لأول يوم عمل بعدها
  if (deadline.unit !== "ساعة" && isRestDay(endDate)) {
    const originalEnd = new Date(endDate)
    while (isRestDay(endDate)) {
      endDate.setDate(endDate.getDate() + 1)
    }
    steps.push(
      `⚠️ الأجل وقع في عطلة (${formatDate(originalEnd)})`
      + ` → نُقل إلى ${formatDate(endDate)}`
    )
  }

  totalMs = endDate.getTime() - start.getTime()
  const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24))

  // حصر العطل داخل الأجل
  const holidaysInPeriod: string[] = []
  let weekendsInPeriod = 0
  let workingDays = 0
  const cursor = new Date(start)
  cursor.setDate(cursor.getDate() + 1)

  while (cursor <= endDate) {
    if (isHoliday(cursor)) {
      holidaysInPeriod.push(formatDateShort(cursor))
    } else if (isWeekend(cursor)) {
      weekendsInPeriod++
    } else {
      workingDays++
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  // تحذيرات
  let warning: string | null = null
  if (totalDays <= 3) {
    warning = "⚠️ أجل قصير جداً — تصرف فوراً!"
  } else if (holidaysInPeriod.length > 0) {
    warning = `📌 يوجد ${holidaysInPeriod.length} عطلة رسمية داخل الأجل`
  }

  steps.push(`✅ تاريخ انتهاء الأجل: ${formatDate(endDate)}`)
  steps.push(`📊 المدة الإجمالية: ${totalDays} يوماً`)
  steps.push(`💼 أيام العمل الصافية: ${workingDays} يوماً`)

  return {
    startDate: start,
    endDate,
    durationDays: totalDays,
    workingDays,
    holidaysInPeriod,
    weekendsInPeriod,
    isUrgent: totalDays <= 3,
    warning,
    steps,
  }
}

// تجميع الآجال حسب الفئة
export function getDeadlinesByCategory(
  deadlines: Deadline[],
  category: string
): Deadline[] {
  if (category === "all") return deadlines
  return deadlines.filter(d => d.category === category)
}

// فلترة الآجال حسب القانون
export function getDeadlinesByLaw(
  deadlines: Deadline[],
  law: "25-14" | "08-09" | "all"
): Deadline[] {
  if (law === "all") return deadlines
  return deadlines.filter(d => d.law === law)
}

// البحث في الآجال
export function searchDeadlines(
  deadlines: Deadline[],
  query: string
): Deadline[] {
  if (!query.trim()) return deadlines
  const normalizedQuery = query.toLowerCase()
  return deadlines.filter(d =>
    d.title.toLowerCase().includes(normalizedQuery) ||
    d.article.includes(query) ||
    d.description.toLowerCase().includes(normalizedQuery)
  )
}

// تنسيق المدة للعرض
export function formatDuration(duration: number, unit: string): string {
  switch (unit) {
    case "ساعة":
      return `${duration} ساعة`
    case "يوم":
      if (duration === 1) return "يوم واحد"
      if (duration === 2) return "يومان"
      if (duration <= 10) return `${duration} أيام`
      return `${duration} يوماً`
    case "شهر":
      if (duration === 1) return "شهر واحد"
      if (duration === 2) return "شهران"
      if (duration <= 10) return `${duration} أشهر`
      return `${duration} شهراً`
    case "سنة":
      if (duration === 1) return "سنة واحدة"
      if (duration === 2) return "سنتان"
      if (duration <= 10) return `${duration} سنوات`
      return `${duration} سنة`
    default:
      return `${duration} ${unit}`
  }
}

// تنسيق تاريخ البداية للعرض
export function formatStartFrom(startFrom: string): string {
  const labels: Record<string, string> = {
    "النطق_بالحكم": "النطق بالحكم",
    "تاريخ_التبليغ": "تاريخ التبليغ",
    "تاريخ_القبض": "تاريخ القبض",
    "اليوم_الموالي_للحكم": "اليوم الموالي للحكم",
    "صدور_الأمر": "صدور الأمر",
    "تاريخ_الإيداع": "تاريخ الإيداع",
    "اكتشاف_السبب": "اكتشاف السبب",
    "انتهاء_الأجل_السابق": "انتهاء الأجل السابق",
    "تاريخ_الجريمة": "تاريخ الجريمة",
  }
  return labels[startFrom] || startFrom.replace(/_/g, " ")
}
