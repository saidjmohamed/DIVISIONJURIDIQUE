'use client';

import { extractTextFromFile } from '@/lib/extract-text';
import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

/* ─────────────────────── Types ─────────────────────── */

interface CheckResult {
  id: string;
  label: string;
  article: string;
  status: 'pass' | 'fail' | 'warning' | 'not_found';
  critical: boolean;
  details: string;
}

interface AnalysisResult {
  result: 'accepted' | 'rejected' | 'needs_review';
  score: number;
  checks: CheckResult[];
  summary: string;
  recommendations: string[];
}

type DocumentType = 'opening' | 'appeal' | 'complaint_regular' | 'complaint_civil' | 'complaint_direct';
type DocumentCategory = 'petition' | 'complaint';

interface CheckRule {
  id: string;
  label: string;
  article: string;
  critical: boolean;
  check: (text: string) => { status: 'pass' | 'fail' | 'warning' | 'not_found'; details: string };
}

const DOC_CATEGORIES: { key: DocumentCategory; label: string }[] = [
  { key: 'petition', label: 'عريضة مدنية' },
  { key: 'complaint', label: 'شكوى جزائية' },
];

const DOC_TYPES: Record<DocumentCategory, { key: DocumentType; label: string }[]> = {
  petition: [
    { key: 'opening', label: 'عريضة افتتاحية' },
    { key: 'appeal', label: 'عريضة استئنافية' },
  ],
  complaint: [
    { key: 'complaint_regular', label: 'شكوى عادية' },
    { key: 'complaint_civil', label: 'شكوى مع ادعاء مدني' },
    { key: 'complaint_direct', label: 'تكليف مباشر' },
  ],
};

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  opening: 'عريضة افتتاحية',
  appeal: 'عريضة استئنافية',
  complaint_regular: 'شكوى عادية',
  complaint_civil: 'شكوى مع ادعاء مدني',
  complaint_direct: 'تكليف مباشر',
};

/* ─────────────────────── Check Rules ─────────────────────── */

function hasKeywords(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw));
}

function hasDatePattern(text: string): boolean {
  // dd/mm/yyyy or written dates
  const ddmmyyyy = /\d{1,2}\/\d{1,2}\/\d{4}/;
  const writtenDate = /(يناير|فبراير|مارس|أبريل|ماي|مايو|جوان|يونيو|جويلية|يوليو|أوت|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر|جانفي|فيفري|أفريل|جوين)/;
  const arabicYear = /\d{4}/;
  return ddmmyyyy.test(text) || (writtenDate.test(text) && arabicYear.test(text));
}

const RULES_OPENING: CheckRule[] = [
  {
    id: 'court_designation',
    label: 'الجهة القضائية المرفوع أمامها الدعوى',
    article: 'م.15 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['محكمة', 'لدى', 'أمام', 'المجلس القضائي']);
      return found
        ? { status: 'pass', details: 'تم العثور على ذكر الجهة القضائية.' }
        : { status: 'fail', details: 'لم يتم تحديد الجهة القضائية. يجب ذكر اسم المحكمة المرفوع أمامها.' };
    },
  },
  {
    id: 'plaintiff_name',
    label: 'اسم ولقب المدعي وموطنه',
    article: 'م.15 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['لفائدة', 'المدعي', 'الطالب', 'السيد', 'السيدة', 'ممثلاً']);
      return found
        ? { status: 'pass', details: 'تم العثور على إشارة للطرف المدعي.' }
        : { status: 'fail', details: 'لم يتم التعريف بالمدعي. يجب ذكر الاسم الكامل والعنوان.' };
    },
  },
  {
    id: 'defendant_name',
    label: 'اسم ولقب المدعى عليه وموطنه',
    article: 'م.15 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['ضد', 'المدعى عليه', 'المطلوب', 'في مواجهة']);
      return found
        ? { status: 'pass', details: 'تم العثور على إشارة للمدعى عليه.' }
        : { status: 'fail', details: 'لم يتم التعريف بالمدعى عليه. يجب ذكر الاسم الكامل والعنوان.' };
    },
  },
  {
    id: 'facts',
    label: 'عرض موجز للوقائع',
    article: 'م.15 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const hasFactsTitle = hasKeywords(text, ['الوقائع', 'حيث أن', 'بناءً على', 'وقائع القضية', 'ملابسات']);
      if (hasFactsTitle && text.length > 500) return { status: 'pass', details: 'تم العثور على عرض الوقائع.' };
      if (hasFactsTitle) return { status: 'warning', details: 'تم العثور على إشارة للوقائع لكن المحتوى قصير، يُنصح بالتفصيل.' };
      return { status: 'fail', details: 'لم يتم العثور على عرض الوقائع. يجب إدراج فقرة موضوعية للوقائع.' };
    },
  },
  {
    id: 'requests',
    label: 'الطلبات',
    article: 'م.15 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['الطلبات', 'يلتمس', 'نلتمس', 'الحكم بـ', 'الحكم ب', 'التفضل بالحكم', 'يطلب']);
      return found
        ? { status: 'pass', details: 'تم العثور على طلبات العريضة.' }
        : { status: 'fail', details: 'لم يتم إدراج الطلبات. يجب تحديد ما تطلبه من المحكمة.' };
    },
  },
  {
    id: 'legal_basis',
    label: 'الوسائل التي تؤسس عليها الدعوى',
    article: 'م.15 ق.إ.م.إ',
    critical: false,
    check: (text) => {
      const found = hasKeywords(text, ['المادة', 'القانون', 'ق.م', 'ق.إ.م.إ', 'م.', 'نصت المادة', 'وفق القانون']);
      return found
        ? { status: 'pass', details: 'تم ذكر مستند قانوني أو مادة من القانون.' }
        : { status: 'warning', details: 'لم يتم ذكر الأساس القانوني صراحةً. يُنصح بالإشارة إلى المواد القانونية المعتمدة.' };
    },
  },
  {
    id: 'supporting_docs',
    label: 'الإشارة إلى المستندات والوثائق المؤيدة',
    article: 'م.15 ق.إ.م.إ',
    critical: false,
    check: (text) => {
      const found = hasKeywords(text, ['المستندات', 'الوثائق', 'المرفقات', 'مرفق', 'الحجج', 'وثيقة', 'وثائق']);
      return found
        ? { status: 'pass', details: 'تمت الإشارة إلى المستندات الداعمة.' }
        : { status: 'not_found', details: 'لا توجد إشارة للمستندات المرفقة. يُنصح بإدراج قائمة المرفقات.' };
    },
  },
  {
    id: 'lawyer_signature',
    label: 'توقيع المحامي على العريضة',
    article: 'م.10 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['المحامي', 'الأستاذ', 'محامي', 'هيئة المحامين', 'الدفاع']);
      return found
        ? { status: 'pass', details: 'تم ذكر المحامي أو الدفاع في العريضة.' }
        : { status: 'fail', details: 'لا توجد إشارة للمحامي. العريضة لا تقبل إلا إذا كانت موقعة من محامٍ.' };
    },
  },
  {
    id: 'date',
    label: 'تاريخ العريضة',
    article: 'م.15 ق.إ.م.إ',
    critical: false,
    check: (text) => {
      return hasDatePattern(text)
        ? { status: 'pass', details: 'تم العثور على تاريخ في العريضة.' }
        : { status: 'warning', details: 'لم يتم العثور على تاريخ واضح. يجب إدراج تاريخ تحرير العريضة.' };
    },
  },
  {
    id: 'subject',
    label: 'موضوع الدعوى',
    article: 'م.15 ق.إ.م.إ',
    critical: false,
    check: (text) => {
      const found = hasKeywords(text, ['الموضوع', 'موضوع', 'في موضوع', 'بخصوص']);
      return found
        ? { status: 'pass', details: 'تم تحديد موضوع الدعوى.' }
        : { status: 'warning', details: 'لم يتم تحديد موضوع الدعوى صراحةً.' };
    },
  },
];

const RULES_APPEAL: CheckRule[] = [
  {
    id: 'appeal_court',
    label: 'الجهة القضائية الاستئنافية (المجلس القضائي)',
    article: 'م.339 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['المجلس القضائي', 'مجلس قضاء', 'غرفة الاستئناف', 'استئناف']);
      return found
        ? { status: 'pass', details: 'تم ذكر جهة الاستئناف.' }
        : { status: 'fail', details: 'لم يتم تحديد المجلس القضائي المختص.' };
    },
  },
  {
    id: 'original_court',
    label: 'الحكم الابتدائي المستأنف',
    article: 'م.336 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['الحكم الصادر عن', 'محكمة', 'الحكم رقم', 'الحكم المستأنف', 'الحكم المطعون']);
      return found
        ? { status: 'pass', details: 'تمت الإشارة إلى الحكم الابتدائي المستأنف.' }
        : { status: 'fail', details: 'لم يتم تحديد الحكم الابتدائي الصادر ضد موكلك.' };
    },
  },
  {
    id: 'appellant_name',
    label: 'اسم المستأنف',
    article: 'م.339 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['المستأنف', 'الطاعن', 'لفائدة', 'يستأنف']);
      return found
        ? { status: 'pass', details: 'تم تحديد هوية المستأنف.' }
        : { status: 'fail', details: 'لم يتم ذكر اسم المستأنف.' };
    },
  },
  {
    id: 'appellee_name',
    label: 'اسم المستأنف عليه',
    article: 'م.339 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['المستأنف عليه', 'ضد', 'في مواجهة']);
      return found
        ? { status: 'pass', details: 'تم تحديد هوية المستأنف عليه.' }
        : { status: 'fail', details: 'لم يتم ذكر اسم المستأنف عليه.' };
    },
  },
  {
    id: 'appeal_reasons',
    label: 'أسباب الاستئناف',
    article: 'م.339 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['أسباب الاستئناف', 'أوجه الاستئناف', 'حيثيات', 'يطعن في', 'الطعن']);
      if (found && text.length > 400) return { status: 'pass', details: 'تم إدراج أسباب الاستئناف.' };
      if (found) return { status: 'warning', details: 'تمت الإشارة لأسباب الاستئناف لكن المحتوى قصير.' };
      return { status: 'fail', details: 'لم يتم إدراج أسباب الاستئناف. يجب تفصيل أوجه الطعن في الحكم الابتدائي.' };
    },
  },
  {
    id: 'original_judgment_copy',
    label: 'إرفاق نسخة من الحكم المستأنف',
    article: 'م.340 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['نسخة الحكم', 'حكم مرفق', 'نسخة من الحكم', 'الحكم المرفق', 'مرفق']);
      return found
        ? { status: 'pass', details: 'تمت الإشارة إلى إرفاق نسخة الحكم.' }
        : { status: 'warning', details: 'لم يُشر إلى إرفاق نسخة الحكم الابتدائي. تأكد من إرفاقها.' };
    },
  },
  {
    id: 'requests',
    label: 'الطلبات الاستئنافية',
    article: 'م.339 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['الطلبات', 'يلتمس', 'نلتمس', 'إلغاء الحكم', 'إصلاح الحكم', 'إبطال']);
      return found
        ? { status: 'pass', details: 'تم إدراج الطلبات الاستئنافية.' }
        : { status: 'fail', details: 'لم يتم تحديد الطلبات. يجب ذكر ما تطلبه من المجلس القضائي.' };
    },
  },
  {
    id: 'lawyer',
    label: 'توقيع المحامي',
    article: 'م.10 ق.إ.م.إ',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['المحامي', 'الأستاذ', 'الدفاع', 'محامي']);
      return found
        ? { status: 'pass', details: 'تم ذكر المحامي.' }
        : { status: 'fail', details: 'لا توجد إشارة للمحامي. العريضة تستوجب توقيع محامٍ.' };
    },
  },
  {
    id: 'date',
    label: 'تاريخ العريضة',
    article: 'م.15 ق.إ.م.إ',
    critical: false,
    check: (text) => {
      return hasDatePattern(text)
        ? { status: 'pass', details: 'تم العثور على تاريخ.' }
        : { status: 'warning', details: 'لم يتم العثور على تاريخ واضح.' };
    },
  },
];

const RULES_COMPLAINT_REGULAR: CheckRule[] = [
  {
    id: 'complainant',
    label: 'هوية المشتكي',
    article: 'م.72 ق.إ.ج',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['المشتكي', 'المدعو', 'المشتكية', 'الضحية', 'ضحية', 'متضرر']);
      return found
        ? { status: 'pass', details: 'تم تحديد هوية المشتكي.' }
        : { status: 'fail', details: 'لم يتم التعريف بالمشتكي.' };
    },
  },
  {
    id: 'accused',
    label: 'هوية المشكو في حقه',
    article: 'م.72 ق.إ.ج',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['المشكو', 'المتهم', 'ضد', 'في حق', 'في مواجهة', 'المشتبه']);
      return found
        ? { status: 'pass', details: 'تم ذكر المشكو في حقه.' }
        : { status: 'fail', details: 'لم يتم تحديد هوية المشكو في حقه.' };
    },
  },
  {
    id: 'facts',
    label: 'وقائع الجريمة المزعومة',
    article: 'م.72 ق.إ.ج',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['الوقائع', 'الجريمة', 'تعرضت', 'حيث أن', 'الحادثة', 'التصرف']);
      if (found && text.length > 300) return { status: 'pass', details: 'تم وصف وقائع الجريمة.' };
      if (found) return { status: 'warning', details: 'وصف الوقائع موجز، يُنصح بالتفصيل.' };
      return { status: 'fail', details: 'لم يتم وصف وقائع الجريمة المزعومة.' };
    },
  },
  {
    id: 'legal_qualification',
    label: 'التكييف القانوني للجريمة',
    article: 'م.72 ق.إ.ج',
    critical: false,
    check: (text) => {
      const found = hasKeywords(text, ['المادة', 'جريمة', 'جنحة', 'جناية', 'مخالفة', 'ق.ع', 'عقوبات']);
      return found
        ? { status: 'pass', details: 'تم ذكر التكييف القانوني للفعل.' }
        : { status: 'warning', details: 'يُنصح بذكر المادة القانونية التي تتضمن الجريمة المشكو منها.' };
    },
  },
  {
    id: 'prosecutor',
    label: 'توجيه الشكوى لوكيل الجمهورية',
    article: 'م.36 ق.إ.ج',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['وكيل الجمهورية', 'النيابة العامة', 'النيابة', 'وكالة الجمهورية', 'السيد النائب']);
      return found
        ? { status: 'pass', details: 'تمت الإشارة إلى الجهة المختصة.' }
        : { status: 'fail', details: 'يجب توجيه الشكوى إلى وكيل الجمهورية لدى المحكمة المختصة.' };
    },
  },
  {
    id: 'date',
    label: 'تاريخ الشكوى',
    article: 'م.72 ق.إ.ج',
    critical: false,
    check: (text) => {
      return hasDatePattern(text)
        ? { status: 'pass', details: 'تم العثور على تاريخ.' }
        : { status: 'warning', details: 'لم يتم العثور على تاريخ واضح.' };
    },
  },
];

const RULES_COMPLAINT_CIVIL: CheckRule[] = [
  ...RULES_COMPLAINT_REGULAR,
  {
    id: 'civil_claim',
    label: 'الادعاء المدني والتعويض',
    article: 'م.72 ق.إ.ج',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['الادعاء المدني', 'تعويض', 'مدعٍ مدني', 'الحقوق المدنية', 'المطالبة المدنية']);
      return found
        ? { status: 'pass', details: 'تم إدراج طلب الادعاء المدني.' }
        : { status: 'fail', details: 'لم يتم الإشارة إلى الادعاء المدني والتعويض المطلوب.' };
    },
  },
  {
    id: 'damage_amount',
    label: 'تقدير مبلغ التعويض',
    article: 'م.72 ق.إ.ج',
    critical: false,
    check: (text) => {
      const found = hasKeywords(text, ['مبلغ', 'دج', 'دينار', 'تعويض قدره', 'مقدار', 'قدر']);
      return found
        ? { status: 'pass', details: 'تم تقدير مبلغ التعويض المطلوب.' }
        : { status: 'warning', details: 'يُنصح بتحديد مبلغ التعويض المطلوب.' };
    },
  },
];

const RULES_COMPLAINT_DIRECT: CheckRule[] = [
  {
    id: 'direct_summons_court',
    label: 'المحكمة الجزائية المختصة',
    article: 'م.337 ق.إ.ج',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['المحكمة', 'الجلسة', 'تكليف مباشر', 'تكليف بالحضور']);
      return found
        ? { status: 'pass', details: 'تم ذكر المحكمة الجزائية المختصة.' }
        : { status: 'fail', details: 'يجب تحديد المحكمة الجزائية المختصة.' };
    },
  },
  {
    id: 'accused_identity',
    label: 'هوية المتهم (الاسم والعنوان)',
    article: 'م.337 ق.إ.ج',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['المتهم', 'المدعو', 'يُكلَّف', 'الشخص المتهم']);
      return found
        ? { status: 'pass', details: 'تم تحديد هوية المتهم.' }
        : { status: 'fail', details: 'يجب ذكر الاسم الكامل وعنوان المتهم.' };
    },
  },
  {
    id: 'offense',
    label: 'الجنحة المنسوبة (م.338 ق.إ.ج)',
    article: 'م.338 ق.إ.ج',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['جنحة', 'جريمة', 'المادة', 'ق.ع', 'عقوبات', 'مخالفة القانون']);
      return found
        ? { status: 'pass', details: 'تم ذكر الجنحة المنسوبة.' }
        : { status: 'fail', details: 'يجب تحديد الجنحة المنسوبة للمتهم مع ذكر النص القانوني.' };
    },
  },
  {
    id: 'civil_claim',
    label: 'الادعاء المدني (الحقوق المدنية)',
    article: 'م.337 ق.إ.ج',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['الادعاء المدني', 'تعويض', 'مدعٍ مدني', 'الحقوق المدنية']);
      return found
        ? { status: 'pass', details: 'تم إدراج الادعاء المدني.' }
        : { status: 'fail', details: 'التكليف المباشر يتضمن ادعاء مدنياً، يجب ذكره.' };
    },
  },
  {
    id: 'facts',
    label: 'وقائع الجريمة',
    article: 'م.337 ق.إ.ج',
    critical: true,
    check: (text) => {
      const found = hasKeywords(text, ['الوقائع', 'الجريمة', 'حيث أن', 'الحادثة']);
      return found && text.length > 300
        ? { status: 'pass', details: 'تم وصف وقائع الجريمة.' }
        : { status: found ? 'warning' : 'fail', details: found ? 'وصف الوقائع موجز.' : 'لم يتم وصف الوقائع.' };
    },
  },
  {
    id: 'date',
    label: 'تاريخ التكليف',
    article: 'م.337 ق.إ.ج',
    critical: false,
    check: (text) => hasDatePattern(text)
      ? { status: 'pass', details: 'تم العثور على تاريخ.' }
      : { status: 'warning', details: 'لم يتم العثور على تاريخ.' },
  },
];

const RULES_MAP: Record<DocumentType, CheckRule[]> = {
  opening: RULES_OPENING,
  appeal: RULES_APPEAL,
  complaint_regular: RULES_COMPLAINT_REGULAR,
  complaint_civil: RULES_COMPLAINT_CIVIL,
  complaint_direct: RULES_COMPLAINT_DIRECT,
};

/* ─────────────────────── Engine ─────────────────────── */

function runChecks(text: string, docType: DocumentType): AnalysisResult {
  const rules = RULES_MAP[docType];
  const normalizedText = text;

  const checks: CheckResult[] = rules.map(rule => {
    const { status, details } = rule.check(normalizedText);
    return { id: rule.id, label: rule.label, article: rule.article, status, critical: rule.critical, details };
  });

  // Score: critical checks have double weight
  let totalWeight = 0;
  let passedWeight = 0;
  checks.forEach(c => {
    const weight = c.critical ? 2 : 1;
    totalWeight += weight;
    if (c.status === 'pass') passedWeight += weight;
    else if (c.status === 'warning') passedWeight += weight * 0.5;
  });
  const score = Math.round((passedWeight / totalWeight) * 100);

  const criticalFails = checks.filter(c => c.critical && c.status === 'fail');
  let result: 'accepted' | 'rejected' | 'needs_review';
  if (criticalFails.length > 0) result = 'rejected';
  else if (score >= 80) result = 'accepted';
  else result = 'needs_review';

  const failedChecks = checks.filter(c => c.status === 'fail' || c.status === 'warning');
  const recommendations: string[] = failedChecks.slice(0, 4).map(c => `تحقق من: ${c.label} (${c.article})`);

  const passCount = checks.filter(c => c.status === 'pass').length;
  const summary = result === 'accepted'
    ? `الوثيقة مستوفية للشروط الشكلية الأساسية (${passCount}/${checks.length} شرط مستوفى).`
    : result === 'rejected'
    ? `الوثيقة تفتقر لشروط جوهرية (${criticalFails.length} شرط جوهري مفقود) وتحتاج إلى مراجعة عاجلة قبل التقديم.`
    : `الوثيقة تستوفي بعض الشروط (${passCount}/${checks.length}) لكن تحتاج لمراجعة قبل التقديم.`;

  return { result, score, checks, summary, recommendations };
}

/* ─────────────────────── Helpers ─────────────────────── */

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

function statusIcon(status: CheckResult['status']): string {
  switch (status) {
    case 'pass': return '✅';
    case 'fail': return '❌';
    case 'warning': return '⚠️';
    case 'not_found': return '❓';
  }
}

function statusBorderColor(status: CheckResult['status']): string {
  switch (status) {
    case 'pass': return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
    case 'fail': return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
    case 'warning': return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
    case 'not_found': return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50';
  }
}

function statusLabel(status: CheckResult['status']): string {
  switch (status) {
    case 'pass': return 'مستوفى';
    case 'fail': return 'مفقود';
    case 'warning': return 'يحتاج مراجعة';
    case 'not_found': return 'غير متوفر';
  }
}

function verdictInfo(result: AnalysisResult['result']): { label: string; color: string; bg: string } {
  switch (result) {
    case 'accepted':
      return { label: 'مقبولة شكلاً', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700' };
    case 'rejected':
      return { label: 'مرفوضة شكلاً', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700' };
    case 'needs_review':
      return { label: 'تحتاج مراجعة', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700' };
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

const PROGRESS_STEPS = [
  'جاري قراءة الملف...',
  'استخراج النص من المستند...',
  'إرسال النص لنموذج الذكاء الاصطناعي...',
  'تحليل الشروط الشكلية بالذكاء الاصطناعي...',
  'مراجعة المواد القانونية...',
  'إعداد التقرير النهائي...',
];

/* ─────────────────────── Component ─────────────────────── */

export default function SmartPetitionChecker({ onBack }: { onBack: () => void }) {
  const [category, setCategory] = useState<DocumentCategory>('petition');
  const [petitionType, setPetitionType] = useState<DocumentType>('opening');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<CheckResult['status'] | 'all'>('all');
  const [copied, setCopied] = useState(false);
  const [aiPowered, setAiPowered] = useState<boolean | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setAnalysis(null);
    const f = acceptedFiles[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      setError('حجم الملف يتجاوز الحد المسموح (10 ميغابايت)');
      return;
    }
    setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    multiple: false,
  });

  function startProgress() {
    setProgressStep(0);
    let step = 0;
    progressInterval.current = setInterval(() => {
      step++;
      if (step < PROGRESS_STEPS.length) setProgressStep(step);
    }, 600);
  }

  function stopProgress() {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setAiPowered(null);
    startProgress();

    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) {
        throw new Error('لم يتم استخراج أي نص من المستند. تأكد أن الملف يحتوي على نص.');
      }

      // ─── Strategy: Try AI first, fallback to local ───
      let result: AnalysisResult;
      let usedAI = false;

      try {
        const res = await fetch('/api/petition-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.slice(0, 8000), petitionType }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.result && data.checks && data.score !== undefined) {
            result = {
              result: data.result,
              score: data.score,
              checks: data.checks,
              summary: data.summary || '',
              recommendations: data.recommendations || [],
            };
            usedAI = !!data.aiPowered;
          } else {
            throw new Error('Invalid AI response');
          }
        } else {
          throw new Error(`API error ${res.status}`);
        }
      } catch {
        // AI failed — fallback to local keyword-based check
        console.warn('AI analysis failed, falling back to local check');
        result = runChecks(text, petitionType);
        usedAI = false;
      }

      setAnalysis(result);
      setAiPowered(usedAI);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      stopProgress();
      setLoading(false);
    }
  }

  function exportResults() {
    if (!analysis) return;
    const typeName = DOC_TYPE_LABELS[petitionType] ?? petitionType;
    const verdict = verdictInfo(analysis.result);
    const lines: string[] = [
      `تقرير التحقق الشكلي الآلي من العرائض`,
      `نوع الوثيقة: ${typeName}`,
      `الملف: ${file?.name ?? '—'}`,
      `النتيجة: ${verdict.label} (${analysis.score}/100)`,
      `${'─'.repeat(50)}`,
      ``,
      `الملخص:`,
      analysis.summary,
      ``,
      `${'─'.repeat(50)}`,
      `الشروط المفحوصة:`,
      ``,
    ];
    for (const check of analysis.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : check.status === 'warning' ? '⚠️' : '❓';
      lines.push(`${icon} ${check.label} (${check.article})${check.critical ? ' [جوهري]' : ''}`);
      lines.push(`   ${check.details}`);
      lines.push(``);
    }
    if (analysis.recommendations.length > 0) {
      lines.push(`${'─'.repeat(50)}`);
      lines.push(`التوصيات:`);
      analysis.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
    }
    lines.push(``, `${'─'.repeat(50)}`);
    lines.push(`تنبيه: هذا التحليل للإرشاد فقط ولا يغني عن المراجعة القانونية المتخصصة.`);
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setFile(null);
    setAnalysis(null);
    setError(null);
    setFilterStatus('all');
    setAiPowered(null);
  }

  const filteredChecks = analysis
    ? filterStatus === 'all' ? analysis.checks : analysis.checks.filter(c => c.status === filterStatus)
    : [];

  const statusCounts = analysis ? {
    all: analysis.checks.length,
    pass: analysis.checks.filter(c => c.status === 'pass').length,
    fail: analysis.checks.filter(c => c.status === 'fail').length,
    warning: analysis.checks.filter(c => c.status === 'warning').length,
    not_found: analysis.checks.filter(c => c.status === 'not_found').length,
  } : null;

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">📋 التحقق الشكلي الآلي من العرائض والشكاوى</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
        قم برفع العريضة أو الشكوى (PDF أو Word) وسيتم التحقق الآلي من استيفاء الشروط الشكلية وفقاً لـق.إ.م.إ وق.إ.ج.
      </p>

      <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4">
        <span className="text-sm flex-shrink-0 mt-0.5">🤖</span>
        <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
          يتم استخدام الذكاء الاصطناعي لتحليل الوثيقة بدقة — مع الاحتفاظ بالتحليل المحلي كبديل تلقائي في حال تعذر الاتصال
        </p>
      </div>

      {/* Document Type Selector */}
      {!analysis && (
        <div className="space-y-3 mb-4">
          <div className="flex gap-2">
            {DOC_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => { setCategory(cat.key); setPetitionType(DOC_TYPES[cat.key][0].key); }}
                className={`flex-1 text-xs px-3 py-2.5 rounded-xl transition-all font-medium ${
                  category === cat.key
                    ? 'bg-[#1a3a5c] text-white dark:bg-[#f0c040] dark:text-[#1a3a5c]'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {cat.key === 'petition' ? '⚖️' : '📝'} {cat.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {DOC_TYPES[category].map(dt => (
              <button
                key={dt.key}
                onClick={() => setPetitionType(dt.key)}
                className={`whitespace-nowrap text-[11px] px-3 py-1.5 rounded-full transition-all ${
                  petitionType === dt.key
                    ? 'bg-[#7c3aed] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {dt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload area */}
      {!analysis && !loading && (
        <>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4 ${
              isDragActive
                ? 'border-[#7c3aed] bg-purple-50 dark:bg-purple-900/20'
                : file
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-[#7c3aed] hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div>
                <div className="text-3xl mb-2">{file.name.endsWith('.pdf') ? '📄' : '📝'}</div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatFileSize(file.size)}</p>
                <p className="text-[10px] text-[#7c3aed] dark:text-purple-400 mt-2">اضغط أو اسحب ملفاً آخر للاستبدال</p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3 opacity-60">📎</div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {isDragActive ? 'أفلت الملف هنا...' : 'اسحب الملف هنا أو اضغط للاختيار'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  PDF أو DOCX — الحد الأقصى 10 ميغابايت
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => { setError(null); setFile(null); }}
                className="text-xs text-red-500 dark:text-red-400 underline mt-1"
              >
                حاول مرة أخرى
              </button>
            </div>
          )}

          {file && !error && (
            <button
              onClick={analyze}
              className="w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>🔍</span>
              <span>بدء التحقق الشكلي</span>
            </button>
          )}
        </>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#7c3aed] border-t-transparent animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">جاري التحقق الشكلي بالذكاء الاصطناعي...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{PROGRESS_STEPS[progressStep]}</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-[#7c3aed] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(((progressStep + 1) / PROGRESS_STEPS.length) * 95, 95)}%` }}
            />
          </div>
          <div className="mt-4 space-y-1.5">
            {PROGRESS_STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                  i < progressStep ? 'text-green-600 dark:text-green-400' :
                  i === progressStep ? 'text-[#7c3aed] dark:text-purple-400 font-medium' :
                  'text-gray-300 dark:text-gray-600'
                }`}
              >
                <span className="flex-shrink-0">
                  {i < progressStep ? '✅' : i === progressStep ? '⏳' : '○'}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Verdict card */}
          {(() => {
            const v = verdictInfo(analysis.result);
            return (
              <div className={`rounded-xl p-4 border ${v.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {analysis.result === 'accepted' ? '✅' : analysis.result === 'rejected' ? '❌' : '⚠️'}
                    </span>
                    <div>
                      <h3 className={`text-base font-bold ${v.color}`}>{v.label}</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {DOC_TYPE_LABELS[petitionType]} — {file?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${analysis.score >= 80 ? 'text-green-600 dark:text-green-400' : analysis.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {analysis.score}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">/ 100</div>
                  </div>
                </div>
                <div className="w-full bg-white/50 dark:bg-gray-900/30 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${scoreColor(analysis.score)}`}
                    style={{ width: `${analysis.score}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-2">📝 الملخص</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Filter tabs */}
          {statusCounts && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(
                [
                  { key: 'all' as const, label: 'الكل', count: statusCounts.all },
                  { key: 'pass' as const, label: 'مستوفى', count: statusCounts.pass },
                  { key: 'fail' as const, label: 'مفقود', count: statusCounts.fail },
                  { key: 'warning' as const, label: 'مراجعة', count: statusCounts.warning },
                  { key: 'not_found' as const, label: 'غير متوفر', count: statusCounts.not_found },
                ] as const
              )
                .filter(tab => tab.count > 0 || tab.key === 'all')
                .map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    className={`whitespace-nowrap text-[10px] px-2.5 py-1 rounded-full transition-all ${
                      filterStatus === tab.key
                        ? 'bg-[#7c3aed] text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
            </div>
          )}

          {/* Checks list */}
          <div className="space-y-2">
            {filteredChecks.map((check, i) => (
              <div
                key={check.id || i}
                className={`rounded-xl p-3 border transition-all ${statusBorderColor(check.status)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0 mt-0.5">{statusIcon(check.status)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{check.label}</span>
                      {check.critical && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium">
                          جوهري
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{check.article}</span>
                      <span className="text-[10px] text-gray-300 dark:text-gray-600">|</span>
                      <span className={`text-[10px] font-medium ${
                        check.status === 'pass' ? 'text-green-600 dark:text-green-400' :
                        check.status === 'fail' ? 'text-red-600 dark:text-red-400' :
                        check.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-gray-500 dark:text-gray-400'
                      }`}>
                        {statusLabel(check.status)}
                      </span>
                    </div>
                    {check.details && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">{check.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-[#1a3a5c] dark:text-[#f0c040] mb-3">💡 التوصيات</h4>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-[#7c3aed] dark:text-purple-400 flex-shrink-0 mt-0.5">●</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI badge */}
          {aiPowered !== null && (
            <div className={`flex items-center gap-2 rounded-xl p-3 border ${aiPowered
              ? 'bg-purple-50 dark:bg-purple-900/15 border-purple-200 dark:border-purple-800'
              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            }`}>
              <span className="text-sm flex-shrink-0">{aiPowered ? '🤖' : '🔧'}</span>
              <p className={`text-[11px] leading-relaxed ${aiPowered
                ? 'text-purple-700 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400'
              }`}>
                {aiPowered
                  ? 'تم التحليل باستخدام الذكاء الاصطناعي — نتائج أدق وأكثر شمولية'
                  : 'تم التحليل محلياً بالكلمات المفتاحية (لم يتوفر الاتصال بالذكاء الاصطناعي)'
                }
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
            <p className="text-[10px] text-yellow-700 dark:text-yellow-400 leading-relaxed">
              ⚠️ تنبيه: هذا التحقق الشكلي للإرشاد فقط {aiPowered ? 'ويستعين بالذكاء الاصطناعي' : 'ويعتمد على تحليل النصوص بالكلمات المفتاحية'}. لا يغني عن المراجعة القانونية المتخصصة.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={exportResults}
              className="flex-1 py-2.5 bg-[#1a3a5c] dark:bg-[#f0c040] text-white dark:text-[#1a3a5c] rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
            >
              {copied ? '✅ تم النسخ' : '📋 نسخ التقرير'}
            </button>
            <button
              onClick={reset}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 transition-all active:scale-[0.98]"
            >
              🔄 فحص وثيقة أخرى
            </button>
          </div>
        </div>
      )}

      {!loading && !analysis && error && (
        <div className="mt-4">
          <button
            onClick={() => setError(null)}
            className="w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-medium transition-all"
          >
            🔄 حاول مرة أخرى
          </button>
        </div>
      )}
    </div>
  );
}
