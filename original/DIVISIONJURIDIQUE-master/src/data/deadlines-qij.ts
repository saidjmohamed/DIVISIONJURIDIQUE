// /data/deadlines-qij.ts
// المصدر: ق.إ.ج 25-14 — الصادر 21/10/2025

export type DeadlineUnit = "ساعة" | "يوم" | "شهر" | "سنة"
export type DeadlineCategory =
  | "توقيف_نظر"
  | "تحقيق"
  | "حبس_مؤقت"
  | "استئناف"
  | "نقض"
  | "معارضة"
  | "التماس_اعادة_نظر"
  | "تقادم"
  | "تبليغ"
  | "طعن_اداري"
  | "تنفيذ"
  | "متفرق"

export type DeadlineStart =
  | "النطق_بالحكم"
  | "تاريخ_التبليغ"
  | "تاريخ_القبض"
  | "اليوم_الموالي_للحكم"
  | "صدور_الأمر"
  | "تاريخ_الإيداع"
  | "اكتشاف_السبب"
  | "انتهاء_الأجل_السابق"
  | "تاريخ_الجريمة"

export type Deadline = {
  id: string
  title: string
  duration: number
  unit: DeadlineUnit
  article: string           // رقم المادة
  law: "25-14" | "08-09"    // رقم القانون
  category: DeadlineCategory
  startFrom: DeadlineStart
  description: string       // شرح مفصّل
  conditions?: string       // شروط وملاحظات
  extensible?: boolean      // قابل للتمديد؟
  extensionDetails?: string // تفاصيل التمديد
  isCalendaire: boolean     // أيام تقويمية (true) أو كاملة (false)
}

export const QIJ_DEADLINES: Deadline[] = [

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📌 القسم ①: التوقيف للنظر
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "qij-83-1",
    title: "التوقيف للنظر — الجرائم العادية",
    duration: 48,
    unit: "ساعة",
    article: "83",
    law: "25-14",
    category: "توقيف_نظر",
    startFrom: "تاريخ_القبض",
    description: "يحق لضابط الشرطة القضائية توقيف أي شخص تستلزم ضرورة التحقيق الاحتفاظ به مدة 48 ساعة",
    extensible: true,
    extensionDetails: "قابل للتمديد مرة واحدة بإذن كتابي من وكيل الجمهورية (48+48 = 96 ساعة)",
    isCalendaire: true,
  },
  {
    id: "qij-83-2",
    title: "التوقيف للنظر — جرائم المخدرات والاتجار",
    duration: 48,
    unit: "ساعة",
    article: "83 فقرة 2",
    law: "25-14",
    category: "توقيف_نظر",
    startFrom: "تاريخ_القبض",
    description: "جرائم المخدرات والاتجار بالبشر والجريمة المنظمة",
    extensible: true,
    extensionDetails: "قابل للتمديد 3 مرات بإذن النيابة (48×4 = 192 ساعة = 8 أيام)",
    isCalendaire: true,
  },
  {
    id: "qij-84",
    title: "التوقيف للنظر — جرائم الإرهاب والمساس بأمن الدولة",
    duration: 48,
    unit: "ساعة",
    article: "84",
    law: "25-14",
    category: "توقيف_نظر",
    startFrom: "تاريخ_القبض",
    description: "الجرائم الماسّة بأمن الدولة وجرائم الإرهاب والتمويل",
    extensible: true,
    extensionDetails: "قابل للتمديد 5 مرات بإذن النيابة (48×6 = 288 ساعة = 12 يوماً)",
    isCalendaire: true,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📌 القسم ②: آجال التحقيق
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "qij-143-1",
    title: "تبليغ أمر الإحالة للمتهم المحبوس",
    duration: 48,
    unit: "ساعة",
    article: "143",
    law: "25-14",
    category: "تحقيق",
    startFrom: "صدور_الأمر",
    description: "يجب تبليغ أمر الإحالة للمتهم المحبوس خلال 48 ساعة من صدوره",
    isCalendaire: true,
  },
  {
    id: "qij-143-2",
    title: "أجل الفصل في طلب الإفراج",
    duration: 5,
    unit: "يوم",
    article: "143",
    law: "25-14",
    category: "تحقيق",
    startFrom: "تاريخ_الإيداع",
    description: "يفصل قاضي التحقيق في طلبات الإفراج خلال 5 أيام من الإيداع",
    isCalendaire: false,
  },
  {
    id: "qij-144-1",
    title: "الحبس المؤقت — الجنح البسيطة",
    duration: 10,
    unit: "يوم",
    article: "144",
    law: "25-14",
    category: "حبس_مؤقت",
    startFrom: "تاريخ_الإيداع",
    description: "الحبس المؤقت الأولي في مواد الجنح لا يتجاوز 10 أيام",
    extensible: true,
    extensionDetails: "قابل للتمديد حتى 30 يوماً بأمر معلل",
    isCalendaire: false,
  },
  {
    id: "qij-144-2",
    title: "الحبس المؤقت — الجنح الجسيمة",
    duration: 10,
    unit: "شهر",
    article: "144",
    law: "25-14",
    category: "حبس_مؤقت",
    startFrom: "تاريخ_الإيداع",
    description: "في الجنح المعاقب عليها بأكثر من 3 سنوات لا يتجاوز 10 أشهر",
    extensible: true,
    extensionDetails: "قابل للتمديد مرتين بأمر معلل",
    isCalendaire: false,
  },
  {
    id: "qij-145",
    title: "الحبس المؤقت — الجنايات",
    duration: 4,
    unit: "شهر",
    article: "145",
    law: "25-14",
    category: "حبس_مؤقت",
    startFrom: "تاريخ_الإيداع",
    description: "الحبس المؤقت الأولي في مواد الجنايات لا يتجاوز 4 أشهر",
    extensible: true,
    extensionDetails: "قابل للتمديد: 4+4+4 أشهر = 16 شهراً كحد أقصى",
    isCalendaire: false,
  },
  {
    id: "qij-146",
    title: "أجل الفصل في استئناف أوامر التحقيق",
    duration: 30,
    unit: "يوم",
    article: "146",
    law: "25-14",
    category: "تحقيق",
    startFrom: "تاريخ_الإيداع",
    description: "يفصل غرفة الاتهام في استئناف أوامر التحقيق خلال 30 يوماً",
    isCalendaire: false,
  },
  {
    id: "qij-150",
    title: "أجل انتهاء التحقيق — الجنح",
    duration: 3,
    unit: "شهر",
    article: "150",
    law: "25-14",
    category: "تحقيق",
    startFrom: "تاريخ_الإيداع",
    description: "يجب إنهاء التحقيق في مواد الجنح في أجل 3 أشهر",
    extensible: true,
    extensionDetails: "قابل للتمديد إلى 8 أشهر بقرار معلل",
    isCalendaire: false,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📌 القسم ③: طرق الطعن العادية
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "qij-411",
    title: "المعارضة في الأحكام الغيابية",
    duration: 10,
    unit: "يوم",
    article: "411",
    law: "25-14",
    category: "معارضة",
    startFrom: "تاريخ_التبليغ",
    description: "أجل المعارضة في الأحكام الغيابية الجزائية هو 10 أيام من تبليغ الحكم للمحكوم عليه",
    conditions: "للمحكوم عليه الغائب فقط. إذا لم يُبلَّغ شخصياً يبدأ الأجل من يوم علمه بالحكم",
    isCalendaire: false,
  },
  {
    id: "qij-418",
    title: "الاستئناف — الجنح والمخالفات (للأطراف)",
    duration: 10,
    unit: "يوم",
    article: "418",
    law: "25-14",
    category: "استئناف",
    startFrom: "اليوم_الموالي_للحكم",
    description: "أجل استئناف أحكام الجنح والمخالفات للمتهم والمدعي المدني هو 10 أيام من اليوم الموالي للنطق بالحكم",
    conditions: "للنيابة العامة أجل 10 أيام من اليوم الموالي. للمتهم المحبوس نفس الأجل يسري من يوم تبليغه",
    isCalendaire: false,
  },
  {
    id: "qij-418-غائب",
    title: "الاستئناف — للمتهم الغائب",
    duration: 10,
    unit: "يوم",
    article: "418",
    law: "25-14",
    category: "استئناف",
    startFrom: "تاريخ_التبليغ",
    description: "للمتهم الغائب يبدأ أجل الاستئناف من تاريخ تبليغه بالحكم",
    isCalendaire: false,
  },
  {
    id: "qij-419",
    title: "الاستئناف — للنيابة العامة",
    duration: 10,
    unit: "يوم",
    article: "419",
    law: "25-14",
    category: "استئناف",
    startFrom: "اليوم_الموالي_للحكم",
    description: "للنيابة العامة أجل الاستئناف 10 أيام من اليوم الموالي للنطق بالحكم",
    conditions: "للنائب العام تمديد الاستئناف حتى 30 يوماً في بعض الجرائم",
    isCalendaire: false,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📌 القسم ④: طرق الطعن غير العادية
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "qij-654",
    title: "الطعن بالنقض — للأطراف الحاضرين",
    duration: 8,
    unit: "يوم",
    article: "654",
    law: "25-14",
    category: "نقض",
    startFrom: "اليوم_الموالي_للحكم",
    description: "أجل الطعن بالنقض في المواد الجزائية هو 8 أيام كاملة تبدأ من اليوم الموالي للنطق بالقرار",
    conditions: "الأطراف الحاضرون أو ممثلون. للنيابة نفس الأجل. يُحسب اليوم الأخير كاملاً",
    isCalendaire: false,
  },
  {
    id: "qij-654-غائب",
    title: "الطعن بالنقض — للمتهم الغائب",
    duration: 8,
    unit: "يوم",
    article: "654",
    law: "25-14",
    category: "نقض",
    startFrom: "تاريخ_التبليغ",
    description: "للمتهم الغائب يبدأ الأجل من تاريخ تبليغه شخصياً بالحكم",
    isCalendaire: false,
  },
  {
    id: "qij-654-خارج",
    title: "الطعن بالنقض — للمقيم خارج الجزائر",
    duration: 30,
    unit: "يوم",
    article: "654",
    law: "25-14",
    category: "نقض",
    startFrom: "تاريخ_التبليغ",
    description: "يستفيد المقيم خارج الجزائر من أجل 30 يوماً للطعن بالنقض يضاف إليه أجل المسافة",
    isCalendaire: false,
  },
  {
    id: "qij-661",
    title: "أجل إيداع المذكرات أمام المحكمة العليا",
    duration: 60,
    unit: "يوم",
    article: "661",
    law: "25-14",
    category: "نقض",
    startFrom: "تاريخ_الإيداع",
    description: "يجب إيداع المذكرة الأساسية للدفاع أمام المحكمة العليا في 60 يوماً من تسجيل الملف",
    isCalendaire: true,
  },
  {
    id: "qij-662",
    title: "الرد على المذكرات أمام المحكمة العليا",
    duration: 30,
    unit: "يوم",
    article: "662",
    law: "25-14",
    category: "نقض",
    startFrom: "تاريخ_التبليغ",
    description: "يُرد على مذكرة المحكوم عليه أمام المحكمة العليا في 30 يوماً من تبليغها",
    isCalendaire: true,
  },
  {
    id: "qij-663",
    title: "الفصل في الطعن بالنقض",
    duration: 30,
    unit: "يوم",
    article: "663",
    law: "25-14",
    category: "نقض",
    startFrom: "تاريخ_الإيداع",
    description: "يُفصل في الطعن بالنقض في مواد الحبس المؤقت في 30 يوماً",
    isCalendaire: true,
  },
  {
    id: "qij-665",
    title: "التماس إعادة النظر — أجل الطعن",
    duration: 15,
    unit: "يوم",
    article: "665",
    law: "25-14",
    category: "التماس_اعادة_نظر",
    startFrom: "اكتشاف_السبب",
    description: "يرفع التماس إعادة النظر في 15 يوماً من اكتشاف الوقائع الجديدة أو الدليل الجديد",
    isCalendaire: false,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📌 القسم ⑤: الآجال أمام غرفة الاتهام
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "qij-199",
    title: "إخطار غرفة الاتهام بالحبس المؤقت",
    duration: 15,
    unit: "يوم",
    article: "199",
    law: "25-14",
    category: "حبس_مؤقت",
    startFrom: "تاريخ_الإيداع",
    description: "تُخطر غرفة الاتهام تلقائياً بالحبس المؤقت المتجاوز 15 يوماً للفصل في استمراره",
    extensible: true,
    extensionDetails: "كل 20 يوماً بعد الإخطار الأول",
    isCalendaire: false,
  },
  {
    id: "qij-224",
    title: "إخطار غرفة الاتهام بانتهاء التحقيق",
    duration: 20,
    unit: "يوم",
    article: "224",
    law: "25-14",
    category: "تحقيق",
    startFrom: "صدور_الأمر",
    description: "يُخطر الأطراف بانتهاء التحقيق ومنحهم 20 يوماً للاطلاع على الملف وتقديم طلباتهم",
    isCalendaire: false,
  },
  {
    id: "qij-226",
    title: "إيداع الطلبات بعد إشعار انتهاء التحقيق",
    duration: 20,
    unit: "يوم",
    article: "226",
    law: "25-14",
    category: "تحقيق",
    startFrom: "تاريخ_التبليغ",
    description: "للأطراف 20 يوماً لتقديم طلباتهم الختامية بعد إشعارهم بانتهاء التحقيق",
    extensible: true,
    extensionDetails: "يمكن التمديد إلى 30 يوماً لأسباب معللة",
    isCalendaire: false,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📌 القسم ⑥: آجال المحاكمة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "qij-258",
    title: "أجل استدعاء المتهم للجلسة",
    duration: 10,
    unit: "يوم",
    article: "258",
    law: "25-14",
    category: "تبليغ",
    startFrom: "تاريخ_التبليغ",
    description: "يجب أن يُستدعى المتهم للجلسة بمهلة لا تقل عن 10 أيام قبل موعد الجلسة",
    isCalendaire: true,
  },
  {
    id: "qij-264",
    title: "الاعتراض على اختصاص المحكمة",
    duration: 24,
    unit: "ساعة",
    article: "264",
    law: "25-14",
    category: "متفرق",
    startFrom: "اليوم_الموالي_للحكم",
    description: "يجب تقديم الدفع بعدم الاختصاص في 24 ساعة من فتح الجلسة",
    isCalendaire: true,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📌 القسم ⑦: التقادم
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "qij-08",
    title: "تقادم الدعوى العمومية — المخالفات",
    duration: 2,
    unit: "سنة",
    article: "8",
    law: "25-14",
    category: "تقادم",
    startFrom: "تاريخ_الجريمة",
    description: "تتقادم الدعوى العمومية في المخالفات بمضي سنتين من يوم اقتراف الجريمة",
    isCalendaire: true,
  },
  {
    id: "qij-09",
    title: "تقادم الدعوى العمومية — الجنح",
    duration: 5,
    unit: "سنة",
    article: "9",
    law: "25-14",
    category: "تقادم",
    startFrom: "تاريخ_الجريمة",
    description: "تتقادم الدعوى العمومية في الجنح بمضي 5 سنوات من يوم اقتراف الجريمة",
    isCalendaire: true,
  },
  {
    id: "qij-10",
    title: "تقادم الدعوى العمومية — الجنايات",
    duration: 15,
    unit: "سنة",
    article: "10",
    law: "25-14",
    category: "تقادم",
    startFrom: "تاريخ_الجريمة",
    description: "تتقادم الدعوى العمومية في الجنايات بمضي 15 سنة من يوم اقتراف الجريمة",
    isCalendaire: true,
  },
  {
    id: "qij-14",
    title: "تقادم العقوبات — المخالفات",
    duration: 2,
    unit: "سنة",
    article: "14",
    law: "25-14",
    category: "تقادم",
    startFrom: "النطق_بالحكم",
    description: "تتقادم العقوبات المحكوم بها في المخالفات بمضي سنتين من صيرورة الحكم نهائياً",
    isCalendaire: true,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📌 القسم ⑧: آجال أمام محكمة الجنايات
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "qij-294",
    title: "استدعاء المتهم لمحكمة الجنايات",
    duration: 20,
    unit: "يوم",
    article: "294",
    law: "25-14",
    category: "تبليغ",
    startFrom: "تاريخ_التبليغ",
    description: "يستدعى المتهم في جنايات بمهلة 20 يوماً على الأقل قبل الجلسة",
    conditions: "8 أيام على الأقل في الحالات الاستعجالية",
    isCalendaire: true,
  },
  {
    id: "qij-542",
    title: "التظلم ضد الحكم الاستعجالي",
    duration: 5,
    unit: "يوم",
    article: "542",
    law: "25-14",
    category: "استئناف",
    startFrom: "اليوم_الموالي_للحكم",
    description: "يقدم التظلم ضد الأوامر الاستعجالية في 5 أيام من اليوم الموالي للنطق بالأمر",
    isCalendaire: false,
  },
  {
    id: "qij-552",
    title: "الطعن في أوامر التفتيش والضبط",
    duration: 15,
    unit: "يوم",
    article: "552",
    law: "25-14",
    category: "طعن_اداري",
    startFrom: "تاريخ_التبليغ",
    description: "يطعن في الأوامر المتعلقة بالتفتيش والضبط أمام القاضي المختص في 15 يوماً",
    extensible: true,
    extensionDetails: "يمتد إلى 30 يوماً إذا كانت الأوراق المضبوطة عدة",
    isCalendaire: false,
  },
  {
    id: "qij-555",
    title: "الفصل في استئناف أوامر المراقبة",
    duration: 10,
    unit: "يوم",
    article: "555",
    law: "25-14",
    category: "استئناف",
    startFrom: "تاريخ_الإيداع",
    description: "يُفصل في استئناف الأوامر المتعلقة بمراقبة الاتصالات في 10 أيام من تسجيله",
    extensible: true,
    extensionDetails: "يمتد إلى 45 يوماً في حالات معقدة بأمر معلل — م 556",
    isCalendaire: false,
  },
  {
    id: "qij-557",
    title: "أجل التسجيل الصوتي والبصري — أمر القاضي",
    duration: 3,
    unit: "يوم",
    article: "557",
    law: "25-14",
    category: "تحقيق",
    startFrom: "صدور_الأمر",
    description: "يُبلَّغ أمر ترخيص التسجيل الصوتي والبصري خلال 3 أيام من صدوره",
    isCalendaire: false,
  },
  {
    id: "qij-562",
    title: "استئناف أوامر رقابة الأموال",
    duration: 10,
    unit: "يوم",
    article: "562",
    law: "25-14",
    category: "استئناف",
    startFrom: "تاريخ_التبليغ",
    description: "يُستأنف الأمر المتعلق بتجميد الأموال في 10 أيام من تبليغه وفق م 759",
    isCalendaire: false,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📌 القسم ⑨: آجال قضاء الأحداث
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "qij-580",
    title: "مدة التوقيف للنظر — الأحداث",
    duration: 24,
    unit: "ساعة",
    article: "580",
    law: "25-14",
    category: "توقيف_نظر",
    startFrom: "تاريخ_القبض",
    description: "مدة التوقيف للنظر للقاصر لا تتجاوز 24 ساعة",
    extensible: true,
    extensionDetails: "مرة واحدة بإذن النيابة (24+24 ساعة) فقط في الجرائم الجسيمة",
    isCalendaire: true,
  },
  {
    id: "qij-581",
    title: "إحالة القاصر على قاضي الأحداث",
    duration: 10,
    unit: "يوم",
    article: "581",
    law: "25-14",
    category: "تحقيق",
    startFrom: "تاريخ_القبض",
    description: "يُحال القاصر الموقوف على قاضي الأحداث في 10 أيام",
    isCalendaire: false,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📌 القسم ⑩: آجال الإجراءات التجارية والجزائية
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "qij-588",
    title: "استئناف أحكام قضايا الشركات",
    duration: 10,
    unit: "يوم",
    article: "588",
    law: "25-14",
    category: "استئناف",
    startFrom: "تاريخ_التبليغ",
    description: "أجل استئناف الأحكام في قضايا الإفلاس والشركات التجارية وفق م 495-497",
    isCalendaire: false,
  },
  {
    id: "qij-592",
    title: "أجل تبليغ الأوراق أمام الغرفة التجارية",
    duration: 24,
    unit: "ساعة",
    article: "592",
    law: "25-14",
    category: "تبليغ",
    startFrom: "تاريخ_الإيداع",
    description: "تُبلَّغ الأوراق بين الأطراف في 24 ساعة من إيداعها في القضايا التجارية المستعجلة",
    isCalendaire: true,
  },
  {
    id: "qij-631",
    title: "التظلم من أعمال التنفيذ الجبري",
    duration: 5,
    unit: "يوم",
    article: "631",
    law: "25-14",
    category: "تنفيذ",
    startFrom: "تاريخ_التبليغ",
    description: "يُقدَّم التظلم من أعمال التنفيذ الجبري في 5 أيام من تبليغ أمر التنفيذ",
    conditions: "يوقف التظلم التنفيذ إذا كان مرفقاً بكفالة كافية",
    isCalendaire: false,
  },
  {
    id: "qij-634",
    title: "الفصل في تظلم التنفيذ الجبري",
    duration: 3,
    unit: "يوم",
    article: "634",
    law: "25-14",
    category: "تنفيذ",
    startFrom: "تاريخ_الإيداع",
    description: "يُفصل في التظلم من التنفيذ الجبري في 3 أيام من تسجيله",
    isCalendaire: false,
  },
  {
    id: "qij-635",
    title: "استئناف قرارات التنفيذ",
    duration: 10,
    unit: "يوم",
    article: "635",
    law: "25-14",
    category: "استئناف",
    startFrom: "اليوم_الموالي_للحكم",
    description: "تُستأنف القرارات الصادرة في إشكاليات التنفيذ في 10 أيام من اليوم الموالي",
    isCalendaire: false,
  },
  {
    id: "qij-638",
    title: "الطعن في قرارات اختصاص التنفيذ",
    duration: 10,
    unit: "يوم",
    article: "638",
    law: "25-14",
    category: "طعن_اداري",
    startFrom: "تاريخ_التبليغ",
    description: "يُطعن في قرارات تحديد الجهة المختصة بالتنفيذ في 10 أيام من التبليغ",
    isCalendaire: false,
  },
]

// ━━━ العطل الرسمية في الجزائر ━━━
export const ALGERIA_HOLIDAYS_2025_2026 = [
  // 2025
  "2025-01-01", // رأس السنة الميلادية
  "2025-01-12", // رأس السنة الأمازيغية
  "2025-03-31", // عيد الفطر
  "2025-04-01", // ثاني أيام عيد الفطر
  "2025-05-01", // عيد العمال
  "2025-06-06", // عيد الأضحى
  "2025-06-07", // ثاني أيام عيد الأضحى
  "2025-06-27", // رأس السنة الهجرية
  "2025-07-05", // عيد الاستقلال
  "2025-09-04", // عيد المولد النبوي
  "2025-11-01", // عيد الثورة
  // 2026
  "2026-01-01", // رأس السنة الميلادية
  "2026-01-12", // رأس السنة الأمازيغية
  "2026-03-20", // عيد الفطر (تقريبي)
  "2026-03-21", // ثاني أيام عيد الفطر
  "2026-05-01", // عيد العمال
  "2026-05-27", // عيد الأضحى (تقريبي)
  "2026-07-05", // عيد الاستقلال
  "2026-11-01", // عيد الثورة
]

// ━━━ تصنيفات الآجال ━━━
export const DEADLINE_CATEGORIES = [
  { value: "all", label: "🔍 الكل", icon: "📋" },
  { value: "توقيف_نظر", label: "🔒 توقيف للنظر", icon: "🔒" },
  { value: "تحقيق", label: "🔎 التحقيق", icon: "🔎" },
  { value: "حبس_مؤقت", label: "⛓️ حبس مؤقت", icon: "⛓️" },
  { value: "استئناف", label: "📤 الاستئناف", icon: "📤" },
  { value: "نقض", label: "🏛️ النقض", icon: "🏛️" },
  { value: "معارضة", label: "↩️ المعارضة", icon: "↩️" },
  { value: "التماس_اعادة_نظر", label: "🔄 التماس إعادة نظر", icon: "🔄" },
  { value: "تقادم", label: "⏳ التقادم", icon: "⏳" },
  { value: "تنفيذ", label: "⚡ التنفيذ", icon: "⚡" },
  { value: "تبليغ", label: "📨 التبليغ", icon: "📨" },
  { value: "طعن_اداري", label: "📑 الطعن الإداري", icon: "📑" },
  { value: "متفرق", label: "📋 متفرقة", icon: "📋" },
]
