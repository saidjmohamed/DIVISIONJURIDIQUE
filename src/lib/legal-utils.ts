/**
 * Legal Utilities — أدوات مساعدة قانونية مشتركة
 *
 * دوال التصنيف والاستخراج المشتركة بين:
 *   - /api/cron/fetch-updates
 *   - /api/telegram-sync
 *
 * تم استخراجها لتجنب تكرار الكود وضمان التناسق
 */

// ── تصنيف نوع المستند القانوني ─────────────────────────────────────────
export function classifyType(text: string): string {
  if (/قانون\s+أساسي|قانون\s+عضوي/.test(text))  return "قانون";
  if (/قانون/.test(text))                          return "قانون";
  if (/مرسوم\s+تنفيذي|décret\s+exécutif/i.test(text)) return "مرسوم تنفيذي";
  if (/مرسوم\s+رئاسي|décret\s+présidentiel/i.test(text)) return "مرسوم رئاسي";
  if (/مرسوم/.test(text))                          return "مرسوم تنفيذي";
  if (/قرار|arrêté/i.test(text))                  return "قرار";
  if (/اجتهاد|قضاء/.test(text))                  return "اجتهاد";
  if (/منشور|circulaire/i.test(text))             return "منشور";
  if (/أمر\s+رقم|ordonnance/i.test(text))        return "أمر";
  return "خبر رسمي";
}

// ── تصنيف المجال القانوني ─────────────────────────────────────────────
export function classifyCategory(text: string): string {
  if (/مدني|عقد|التزام|مسؤولية/.test(text))          return "مدني";
  if (/جزائي|جنائي|عقوب|جريمة/.test(text))           return "جزائي";
  if (/إداري|وظيف|تأديب|صفقات|دوائر/.test(text))     return "إداري";
  if (/تجاري|شركة|استثمار|أعمال|تجار/.test(text))     return "تجاري";
  if (/عمل|شغل|أجر|نقاب|ضمان\s+اجتماعي/.test(text))  return "عمالي";
  if (/أسرة|زواج|طلاق|نفقة|حضانة/.test(text))        return "عائلي";
  if (/عقار|ملكية|بناء|تعمير|أراضي/.test(text))       return "عقاري";
  if (/دستور|انتخاب|برلمان|رئاس|هيئة ناخبة/.test(text)) return "دستوري";
  return "إداري";
}

// ── استخراج رقم القانون ───────────────────────────────────────────────
export function extractLawNumber(text: string): string | undefined {
  const m = text.match(/رقم\s+(\d{2,3}-\d{2,3})/i)
         || text.match(/(?:مرسوم|قانون)\s+(\d{2,3}-\d{2,3})/i)
         || text.match(/n[°o]\s*(\d{2,3}-\d{2,3})/i)
         || text.match(/(\d{2,3}-\d{2,3})/);
  return m ? m[1] : undefined;
}

// ── تنظيف HTML ─────────────────────────────────────────────────────────
export function stripHtml(html: string, preserveBreaks = false): string {
  return html
    .replace(/<br\s*\/?>/gi, preserveBreaks ? "\n" : " ")
    .replace(/<[^>]+>/g, preserveBreaks ? "" : " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── فلتر: هل الخبر ذو طابع قانوني/تشريعي؟ ───────────────────────────
export function isLegallyRelevant(text: string): boolean {
  return /مرسوم|قانون|قرار|تشريع|انتخاب|دستور|تعديل|صادق|يوقع|مجلس\s+الوزراء|أمر\s+رقم|منشور|نظام|مرفق/.test(text);
}

// ── توليد معرف فريد من المصدر والعنوان ───────────────────────────────
export function genEntryId(source: string, title: string): string {
  return Buffer.from(`${source}:${title.slice(0, 40)}`).toString("base64url").slice(0, 20);
}
