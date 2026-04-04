/**
 * محرك القواعد القانونية الجزائرية (Algerian Legal Rules Engine)
 * يحتوي على القواعد الشكلية والموضوعية المستمدة من ق.إ.م.إ وق.إ.ج
 */

export interface LegalRule {
  id: string;
  label: string;
  article: string;
  law: '08-09' | 'qij' | 'civil';
  critical: boolean;
  keywords: string[];
  description: string;
}

// قواعد العريضة الافتتاحية (المادة 14 و 15 من ق.إ.م.إ)
export const OPENING_PETITION_RULES: LegalRule[] = [
  {
    id: 'court_mention',
    label: 'ذكر الجهة القضائية',
    article: '15 فقرة 1',
    law: '08-09',
    critical: true,
    keywords: ['محكمة', 'مجلس قضاء', 'القسم', 'الغرفة'],
    description: 'يجب ذكر الجهة القضائية المرفوع أمامها الدعوى بدقة.'
  },
  {
    id: 'plaintiff_info',
    label: 'بيانات المدعي الكاملة',
    article: '15 فقرة 2',
    law: '08-09',
    critical: true,
    keywords: ['المدعي', 'السيد', 'الساكن بـ', 'المقيم بـ'],
    description: 'الاسم واللقب والموطن للمدعي (أو التسمية والمقر الاجتماعي للشخص المعنوي).'
  },
  {
    id: 'defendant_info',
    label: 'بيانات المدعى عليه',
    article: '15 فقرة 3',
    law: '08-09',
    critical: true,
    keywords: ['المدعى عليه', 'ضد', 'المسكن بـ'],
    description: 'الاسم واللقب والموطن للمدعى عليه.'
  },
  {
    id: 'facts_summary',
    label: 'عرض الوقائع',
    article: '15 فقرة 4',
    law: '08-09',
    critical: true,
    keywords: ['الوقائع', 'حيث أن', 'بموجب'],
    description: 'عرض موجز للوقائع والطلبات والأسانيد التي تؤسس عليها الدعوى.'
  },
  {
    id: 'lawyer_signature',
    label: 'توقيع المحامي',
    article: '15 فقرة 5',
    law: '08-09',
    critical: false,
    keywords: ['الأستاذ', 'محام', 'توقيع'],
    description: 'توقيع المحامي ما لم ينص القانون على خلاف ذلك.'
  }
];

// قواعد الشكوى الجزائية (قانون الإجراءات الجزائية)
export const CRIMINAL_COMPLAINT_RULES: LegalRule[] = [
  {
    id: 'prosecutor_mention',
    label: 'توجيه الشكوى لوكيل الجمهورية',
    article: '36',
    law: 'qij',
    critical: true,
    keywords: ['السيد وكيل الجمهورية', 'نيابة الجمهورية'],
    description: 'يجب توجيه الشكوى إلى وكيل الجمهورية المختص إقليمياً.'
  },
  {
    id: 'incident_details',
    label: 'تفاصيل الواقعة (زمان ومكان)',
    article: 'qij',
    law: 'qij',
    critical: true,
    keywords: ['بتاريخ', 'بمكان', 'واقعة', 'جريمة'],
    description: 'تحديد تاريخ ومكان وقوع الفعل المجرم بدقة.'
  },
  {
    id: 'civil_party_claim',
    label: 'التأسيس كطرف مدني (أمام قاضي التحقيق)',
    article: '72',
    law: 'qij',
    critical: false,
    keywords: ['طرف مدني', 'الادعاء المدني'],
    description: 'في حال تقديم الشكوى أمام قاضي التحقيق، يجب التصريح بالتأسيس كطرف مدني.'
  }
];

// منطق تحديد الاختصاص النوعي (Subject Matter Jurisdiction)
export interface JurisdictionResult {
  section: string;
  formation: 'فردي' | 'جماعي' | string;
  legalBasis: string;
  description: string;
}

export function getSubjectMatterJurisdiction(caseType: string): JurisdictionResult {
  const types: Record<string, JurisdictionResult> = {
    'عقاري': {
      section: 'القسم العقاري',
      formation: 'فردي',
      legalBasis: 'المادة 500 من ق.إ.م.إ',
      description: 'يختص بالنظر في جميع المنازعات المتعلقة بالعقارات (ملكية، حيازة، إيجارات فلاحية).'
    },
    'تجاري': {
      section: 'القسم التجاري / المحكمة التجارية المتخصصة',
      formation: 'جماعي (في المتخصصة) / فردي (في القسم)',
      legalBasis: 'المادة 531 من ق.إ.م.إ',
      description: 'يختص بالمنازعات التجارية بين التجار أو المتعلقة بالأعمال التجارية.'
    },
    'شؤون_أسرة': {
      section: 'قسم شؤون الأسرة',
      formation: 'فردي',
      legalBasis: 'المادة 423 من ق.إ.م.إ',
      description: 'يختص بمنازعات الزواج، الطلاق، الحضانة، الميراث والولاية.'
    },
    'اجتماعي': {
      section: 'القسم الاجتماعي',
      formation: 'جماعي (قاضي ومساعدان)',
      legalBasis: 'المادة 500 من ق.إ.م.إ والقانون 90-04',
      description: 'يختص بمنازعات العمل الفردية والضمان الاجتماعي.'
    },
    'إداري': {
      section: 'المحكمة الإدارية',
      formation: 'جماعي (3 قضاة على الأقل)',
      legalBasis: 'المادة 800 من ق.إ.م.إ',
      description: 'تختص بالمنازعات التي تكون الدولة أو الولاية أو البلدية أو المؤسسة العمومية طرفاً فيها.'
    },
    'استعجالي': {
      section: 'قاضي الاستعجال',
      formation: 'فردي',
      legalBasis: 'المادة 299 من ق.إ.م.إ',
      description: 'يختص بالتدابير المؤقتة التي لا تمس بأصل الحق عند توفر عنصر الاستعجال.'
    }
  };

  return types[caseType] || {
    section: 'القسم المدني (الاختصاص العام)',
    formation: 'فردي',
    legalBasis: 'المادة 31 من ق.إ.م.إ',
    description: 'يختص القسم المدني بجميع القضايا التي لا تدخل في اختصاص الأقسام الأخرى.'
  };
}

/**
 * دالة برمجية لفحص النص (العريضة) بناءً على القواعد
 */
export function checkPetitionText(text: string, rules: LegalRule[]) {
  const results = rules.map(rule => {
    const found = rule.keywords.some(kw => text.includes(kw));
    return {
      ...rule,
      passed: found
    };
  });

  const score = (results.filter(r => r.passed).length / rules.length) * 100;
  const criticalFailed = results.some(r => r.critical && !r.passed);

  return {
    results,
    score,
    status: criticalFailed ? 'rejected' : score > 80 ? 'accepted' : 'needs_review'
  };
}
