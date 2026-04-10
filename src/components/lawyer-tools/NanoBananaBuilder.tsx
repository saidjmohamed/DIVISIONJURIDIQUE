'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type DesignType = 'vertical-4k' | 'horizontal' | 'carousel';
type ContentStyle = 'simple' | 'professional' | 'social';

interface GeneratedOutput {
  json: string;
  timestamp: number;
  topic: string;
}

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

const DESIGN_TYPES: { id: DesignType; label: string; icon: string }[] = [
  { id: 'vertical-4k', label: 'إنفوجرافيك عمودي 4K', icon: '📐' },
  { id: 'horizontal', label: 'إنفوجرافيك أفقي', icon: '🖼️' },
  { id: 'carousel', label: 'كاروسيل فايسبوك', icon: '🔄' },
];

const CONTENT_STYLES: { id: ContentStyle; label: string; desc: string; icon: string }[] = [
  { id: 'simple', label: 'مبسّط للعامة', desc: 'ELI5 — سهل الفهم', icon: '🧑‍🎓' },
  { id: 'professional', label: 'احترافي قانوني', desc: 'دقيق مع المراجع', icon: '👨‍⚖️' },
  { id: 'social', label: 'تفاعلي سوشيال ميديا', desc: 'Hook + CTA', icon: '📱' },
];

const HOT_TOPICS = [
  'خيانة الأمانة في القانون الجزائري',
  'شروط الطعن بالنقض',
  'الآجال القانونية في القانون المدني الجزائري',
  'الفرق بين الجنحة والجناية',
  'الشركة ذات المسؤولية المحدودة',
  'عقد الزواج وشروطه القانونية',
  'الطرد غير القانوني للمستأجر',
  'حادث المرور والمسؤولية المدنية',
  'الشفعة في القانون المدني الجزائري',
  'الوقف التنفيذي وآثاره',
  'الوصية وأنواعها في القانون المدني',
  'الدعوى العمومية والمدنية في المادة الجزائية',
  'الحق في الحياة الخاصة وحمايتها',
  'التقادم المسقط في القانون الجزائري',
  'الكفالة وأحكامها في القانون المدني',
  'الإيجار التجاري وشطوان 1975',
  'الميراث وحصص الورثة في الإسلام',
  'الطعن بالاستئناف وإجراءاته',
  'التعويض عن الضرر الجسدي',
  'الأمر بالحضور وتكليف بالحضور',
];

/* ═══════════════════════════════════════════════════════
   OFFLINE LEGAL ANALYSIS ENGINE
   ═══════════════════════════════════════════════════════ */

interface LegalAnalysis {
  caseType: 'جزائي' | 'مدني' | 'إداري' | 'تجاري' | 'أحوال شخصية';
  classification?: 'مخالفة' | 'جنحة' | 'جناية';
  crimeNature?: 'شكلية' | 'مادية';
  definition: string;
  example: string;
  legalBasis: string;
  materialElement: string;
  moralElement: string;
  hook: string;
  summary: string;
}

function normalizeAr(str: string): string {
  return str
    .toLowerCase()
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ـ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectLegalTopic(topic: string): LegalAnalysis {
  const t = normalizeAr(topic);

  /* ── خيانة الأمانة ── */
  if (t.includes('خيانة الامانه') || t.includes('خيانة الأمانة') || t.includes('الامانه')) {
    return {
      caseType: 'جزائي', classification: 'جنحة', crimeNature: 'مادية',
      definition: 'خيانة الأمانة هي أن يستولي شخص على أموال أو أشياء تسلمها إياه المالك أو نائبه على أن يردها أو يستعملها في أمر معين، فيمتنع عن ردها أو يصرفها في غير الغرض المحدد.',
      example: 'شخص استأجر شقة وسلم المالك مفاتيحها مع وديعة مالية، ثم هجر الشقة واختفى بالمال والأمتعة.',
      legalBasis: 'المادة 376 إلى المادة 388 من قانون العقوبات الجزائري (الأمر رقم 66-156). العقوبة: الحبس من سنة إلى 5 سنوات وغرامة من 20.000 إلى 200.000 دج.',
      materialElement: 'التسلم (استلام الشيء بحسن نية أو بناء على عقد) + الاختلاس أو التصرف بخلاف الشرط + ضرر يلحق بالمالك',
      moralElement: 'القصد الجنائي: نية التملك أو التصرف في الشيء بخلاف ما اتفق عليه. تتوفر في اللحظة التي يمتنع فيها عن الرد.',
      hook: 'هل تعلم أن عدم رد وديعة قد يجعلك أمام القضاء؟',
      summary: 'خيانة الأمانة جنحة تُعاقب بالحبس والغرامة، وتتحقق بتسلم الشيء بنية حسنة ثم الامتناع عن رده.',
    };
  }

  /* ── السرقة ── */
  if (t.includes('سرق') || t.includes('السرقة') || t.includes('نشل')) {
    return {
      caseType: 'جزائي', classification: 'جنحة', crimeNature: 'مادية',
      definition: 'السرقة هي اختلاس شيء منقول مملوك للغير بخفية أو دون رضا مالكه بنية تملكه.',
      example: 'شخص يدخل متجراً ويختبئ بضاعة في جيبه ويخرج بدون دفع ثمنها.',
      legalBasis: 'المادة 350 إلى المادة 358 من قانون العقوبات. ظروف التشديد: السرقة بالليل، بالسلاح، من طرف شخصين فأكثر، في مكان مأهول.',
      materialElement: 'اختلاس شيء منقول (أخذ حيازة غير مشروعة) + مملوك للغير + بدون رضا المالك (خفية أو قوة)',
      moralElement: 'نية التملك (animus furandi) — الإرادة الحرة والمتعمدة للاستيلاء على الشيء.',
      hook: 'ما الفرق بين السرقة والاحتيال؟ الجواب قد يفاجئك!',
      summary: 'السرقة جنحة تعاقب عليها المادة 350 ق.ع وتشدد في حالات معينة كاستعمال السلاح أو التعدد.',
    };
  }

  /* ── نصب واحتيال ── */
  if (t.includes('نصب') || t.includes('احتيال') || t.includes('تزوير') || t.includes('غش')) {
    return {
      caseType: 'جزائي', classification: 'جنحة', crimeNature: 'مادية',
      definition: 'الاحتيال هو استعمال وسائل احتيالية من أجل الإيقاع بشخص في غلط يدفعه إلى تقديم تنازل أو تسليم نقود أو بضاعة أو توقيع سند.',
      example: 'شخص يتظاهر بكونه تاجراً ويقدم بضاعة مزيفة على أنها أصلية للحصول على المال.',
      legalBasis: 'المادة 372 ق.ع (الاحتيال) والمادة 373 ق.ع (عقوبة الاحتيال). الحبس من 1 إلى 5 سنوات وغرامة.',
      materialElement: 'استعمال وسائل احتيالية (تزوير الهوية، استعمال أسماء وهمية، إظهار مشروع كاذب) + الإيقاع بالضحية + الحصول على منفعة مادية',
      moralElement: 'القصد الجنائي: نية الإيقاع بالضحية واستعمال الوسائل الاحتيالية للحصول على منفعة غير مشروعة.',
      hook: 'اكتشفت أن العقد الذي وقعته مزيف؟ إليك حقوقك القانونية!',
      summary: 'الاحتيال جنحة بموجب المادة 372 ق.ع وتتحقق باستعمال وسائل خداعية للحصول على منفعة مالية.',
    };
  }

  /* ── الطعن بالنقض ── */
  if (t.includes('نقض') || t.includes('النقض') || t.includes('المحكمه العليا') || t.includes('المحكمة العليا')) {
    return {
      caseType: 'مدني',
      definition: 'الطعن بالنقض هو طريق طعن غير عادي يُرفع أمام المحكمة العليا للطعن في الأحكام النهائية التي صدرت مخالفة للقانون.',
      example: 'محكمة الاستئناف أصدرت حكماً نهائياً بتطبيق نص قانوني ملغى — يحق للمحكوم عليه الطعن بالنقض.',
      legalBasis: 'المادة 349 إلى المادة 370 من ق.إ.م.إ (قانون الإجراءات المدنية والإدارية). المواعيد: شهران من تاريخ التبليغ.',
      materialElement: '',
      moralElement: '',
      hook: 'حكم نهائي ظالم؟ المحكمة العليا قد تُلغيه!',
      summary: 'الطعن بالنقض لا يُنظر في الوقائع بل في صحّة تطبيق القانون فقط.',
    };
  }

  /* ── الاستئناف ── */
  if (t.includes('استئناف') || t.includes('الاستئناف') || t.includes('محكمه الاستئناف') || t.includes('محكمة الاستئناف')) {
    return {
      caseType: 'مدني',
      definition: 'الاستئناف هو طريق طعن عادي يُرفع أمام محكمة الدرجة الثانية (مجلس القضاء) لإعادة النظر في القضية من حيث الوقائع والقانون.',
      example: 'صدر حكم ابتدائي برفض دعوى التعويض عن حادث — يمكن للمتضرر استئنافه خلال 30 يوماً.',
      legalBasis: 'المادة 336 إلى المادة 341 من ق.إ.م.إ. الأجل: 30 يوماً من تاريخ التبليغ للجزائي، شهر للمدني.',
      materialElement: '',
      moralElement: '',
      hook: 'غير راضٍ عن الحكم الابتدائي؟ لديك حق الاستئناف!',
      summary: 'الاستئناف يعيد فتح القضية وقائعاً وقانوناً أمام محكمة أعلى درجة.',
    };
  }

  /* ── الآجال القانونية ── */
  if (t.includes('اجل') || t.includes('أجل') || t.includes('آجال') || t.includes('مواعيد')) {
    return {
      caseType: 'مدني',
      definition: 'الآجال القانونية هي المدد التي حددها المشرع لإقامة الدعاوى أو ممارسة الطعون أو اتخاذ إجراءات معينة، ويترتب على فواتها سقوط الحق.',
      example: 'الطعن بالاستئناف خلال 30 يوماً — إن انقضى الأجل دون الطعن، أصبح الحكم نهائياً.',
      legalBasis: 'المادة 308 ق.م (التقادم المسقط 15 سنة)، المادة 336 ق.إ.م.إ (أجل الاستئناف)، المادة 349 ق.إ.م.إ (أجل النقض شهران).',
      materialElement: '',
      moralElement: '',
      hook: 'هل你知道 أن بعض الآجال تبدأ من تاريخ التبليغ وليس تاريخ الحكم؟',
      summary: 'الآجال القانونية هي حجر الأساس في الإجراءات — فواتها يعني سقوط الحق.',
    };
  }

  /* ── الجنحة والجناية ── */
  if (t.includes('جنح') || t.includes('جناي') || t.includes('مخالف') || (t.includes('فرق') && (t.includes('جنح') || t.includes('جنا')))) {
    return {
      caseType: 'جزائي', classification: 'جنحة', crimeNature: 'مادية',
      definition: 'تصنف الجرائم في القانون الجزائري إلى ثلاث فئات: المخالفات (عقوبات بسيطة)، الجنح (حبس من شهرين إلى 5 سنوات)، والجرائم (حبس أكثر من 5 سنوات أو الإعدام).',
      example: 'السرقة العادية جنحة (حبس 1-5 سنوات)، بينما السرقة بالإكراه المسلح جناية (حبس 5-10 سنوات).',
      legalBasis: 'المادة 5 ق.ع: الجنايات عقوبتها الإعدام أو الحبس المؤقت أو الحبس لمدة تزيد عن 5 سنوات. المادة 6: الجنح عقوبتها الحبس من شهرين إلى 5 سنوات. المادة 7: المخالفات عقوبتها الغرامة.',
      materialElement: '',
      moralElement: '',
      hook: 'هل تعلم أن نفس الفعل قد يكون جنحة أو جناية حسب الظروف؟',
      summary: 'التصنيف الثلاثي (مخالفة/جنحة/جناية) يحدد الاختصاص والمسطرة والعقوبة.',
    };
  }

  /* ── الشركات (ش.م.م) ── */
  if (t.includes('شرك') || t.includes('مسؤولية محدودة') || t.includes('تضامن') || t.includes('ش.م.م') || t.includes('sarl') || t.includes('spa')) {
    return {
      caseType: 'تجاري',
      definition: 'الشركة ذات المسؤولية المحدودة (SARL) هي شركة تجارية لا يزيد عدد شركائها على 50، ولا يسأل الشريك فيها إلا في حدود حصته في رأس المال.',
      example: '3 أصدقاء يؤسسون SARL برأس مال 1.000.000 دج — مسؤولية كل منهم محدودة بحصته.',
      legalBasis: 'المادة 544 وما بعدها من القانون التجاري. المادة 546: الحد الأدنى لرأس المال 100.000 دج.',
      materialElement: '',
      moralElement: '',
      hook: 'تريد تأسيس شركة؟ إليك الفرق بين SARL و EURL!',
      summary: 'SARL: شركة تجارية بمسؤولية محدودة، رأس مال لا يقل عن 100.000 دج، لا يتجاوز 50 شريكاً.',
    };
  }

  /* ── الزواج والأحوال الشخصية ── */
  if (t.includes('زواج') || t.includes('طلاق') || t.includes('خلاف') || t.includes('نفقه') || t.includes('حضان') || t.includes('ميراث') || t.includes('وصي')) {
    return {
      caseType: 'أحوال شخصية',
      definition: 'عقد الزواج هو عقد رضائي يُبرم بين الرجل والمرأة وفق الشروط الشرعية والقانونية، ويثبت بتصريح رسمي لدى ضابط الحالة المدنية.',
      example: 'عقد زواج تم دون إذن الولي للقاصرية — العقد قابل للإبطال وفق المادة 9 من قانون الأسرة.',
      legalBasis: 'قانون الأسرة رقم 84-11: المادة 4 (الرضا)، المادة 5 (السن)، المادة 7 (أهلية الزوج)، المادة 9 (الولاية).',
      materialElement: '',
      moralElement: '',
      hook: 'هل تعرف شروط صحة عقد الزواج في القانون الجزائري؟',
      summary: 'يُشترط في الزواج: الرضا، بلوغ سن 19 للمرأة و21 للرجل، الأهلية، انتفاء الموانع.',
    };
  }

  /* ── الطرد/الإيجار ── */
  if (t.includes('طرد') || t.includes('ايجار') || t.includes('إيجار') || t.includes('مستاجر') || t.includes('مؤجر') || t.includes('كراء')) {
    return {
      caseType: 'مدني',
      definition: 'الإيجار عقد يلتزم به المؤجر بأن يمكن المستأجر من الانتفاع بشيء مدة معينة مقابل بدل.',
      example: 'مالك يحاول طرد مستأجر قبل انتهاء العقد ودون حكم قضائي — هذا طرد غير قانوني.',
      legalBasis: 'المادة 467 إلى المادة 495 ق.م (الإيجار). القانون رقم 95-09 المتعلق بكراء الأماكن المعدة للسكنى أو الاستعمال المهني.',
      materialElement: '',
      moralElement: '',
      hook: 'هل يمكن لمالك العقار طرده بدون حكم قضائي؟ الإجابة قد تفاجئك!',
      summary: 'لا يجوز طرد المستأجر إلا بحكم قضائي نهائي وبعد استنفاد مسطرة الإثبات.',
    };
  }

  /* ── حادث المرور ── */
  if (t.includes('حادث') || t.includes('مرور') || t.includes('سيار') || t.includes('اصطدام') || t.includes('تعويض عن الضرر الجسدي')) {
    return {
      caseType: 'مدني',
      definition: 'المسؤولية عن حوادث المرور تقوم على أساس مبدأ تحمل التبعة (خطر الشيء) حيث يسأل قائد المركبة عن الأضرار التي يسببها بدون حاجة لإثبات الخطأ.',
      example: 'سائق يصطدم بمشاة في ممر المشاة — يسأل عن التعويض الكامل للأضرار الجسدية والمادية.',
      legalBasis: 'المادة 124 ق.م (المسؤولية التقصيرية)، المادة 138 ق.م (تحمل التبعة). القانون 01-14 المتعلق بملكية العقارات وعمليات الترقية.',
      materialElement: '',
      moralElement: '',
      hook: 'حادث مرور غيّر حياتك؟ إليك كيف تحصل على تعويض كامل!',
      summary: 'مبدأ تحمل التبعة يجعل سائق المركبة مسؤولاً عن الأضرار دون حاجة لإثبات الخطأ.',
    };
  }

  /* ── الشفعة ── */
  if (t.includes('شفع')) {
    return {
      caseType: 'مدني',
      definition: 'الشفعة حق يخول للشريك على الشيوع أن يحل محل المشتري في عقد البيع المبرم بين شريكه وأجنبي.',
      example: 'شريكان يملكان عقاراً — باع أحدهما حصته لشخص خارجي. للشريك الآخر حق الشفعة.',
      legalBasis: 'المادة 794 إلى المادة 806 من القانون المدني. الأجل: شهران من تاريخ الإعلان.',
      materialElement: '',
      moralElement: '',
      hook: 'باع شريكك حصته في العقار؟ لديك حق الشفعة!',
      summary: 'الشفعة حق لحماية الشريك على الشيوع من دخول شريك جديد عليه.',
    };
  }

  /* ── الوقف التنفيذي ── */
  if (t.includes('وقف تنفيذ') || t.includes('الوقف التنفيذي') || t.includes('نفاذ معجل')) {
    return {
      caseType: 'مدني',
      definition: 'الوقف التنفيذي هو إجراء يطلب فيه المحكوم عليه من المحكمة وقف تنفيذ الحكم المؤقت حتى يتم البت في الطعن المرفوع ضده.',
      example: 'حكم ابتدائي بالطرد — طلب المحكوم عليه وقف التنفيذ أثناء الاستئناف.',
      legalBasis: 'المادة 323 ق.إ.م.إ (النفاذ المعجل) والمادة 292 ق.إ.م.إ (الأمر بالوقف).',
      materialElement: '',
      moralElement: '',
      hook: 'حكم صدر ضدك ولم يكتسب بعد الدرجة القضائية النهائية — ماذا تفعل؟',
      summary: 'الوقف التنفيذي يحمي المحكوم عليه من تنفيذ حكم لم يصبح نهائياً بعد.',
    };
  }

  /* ── الميراث ── */
  if (t.includes('ميراث') || t.includes('ورث') || t.includes('حصص الورث') || t.includes('إرث') || t.includes('فرائض')) {
    return {
      caseType: 'أحوال شخصية',
      definition: 'الميراث هو انتقال أموال المتوفى إلى ورثته الشرعيين وفق أحكام الشريعة الإسلامية والقانون الجزائري.',
      example: 'توفيت امرأة عن زوج وأولاد — للزوج الربع والباقي للأولاد للذكر مثل حظ الأنثيين.',
      legalBasis: 'قانون الأسرة رقم 84-11: المادة 140 إلى المادة 186 (المواريث). والعهدة: المادة 164.',
      materialElement: '',
      moralElement: '',
      hook: 'هل تعرف حصتك الشرعية في الميراث؟',
      summary: 'الميراث في الجزائر يخضع لأحكام الشريعة الإسلامية — للذكر مثل حظ الأنثيين.',
    };
  }

  /* ── التقادم ── */
  if (t.includes('تقادم') || t.includes('تقادم المسقط')) {
    return {
      caseType: 'مدني',
      definition: 'التقادم المسقط هو انقضاء الحق بمرور المدة القانونية دون المطالبة به. المدة العامة 15 سنة، وقد تُخفض إلى 5 أو 10 سنوات في بعض الحالات.',
      example: 'دائن لم يطالب بدينه منذ 15 سنة — سقط حقه بالتقادم المسقط.',
      legalBasis: 'المادة 308 ق.م (التقادم المسقط 15 سنة). المادة 717 ق.م: الحقوق المتنازع عليها تتقادم بـ 5 سنوات.',
      materialElement: '',
      moralElement: '',
      hook: 'دَين قديم لم تطالب به؟ قد يكون سقط بالتقادم!',
      summary: 'التقادم المسقط هو 15 سنة عموماً و5 سنوات للحقوق المتنازع عليها (المادة 717 ق.م).',
    };
  }

  /* ── الكفالة ── */
  if (t.includes('كفال')) {
    return {
      caseType: 'مدني',
      definition: 'الكفالة عقد بموجبه يلتزم شخص (الكفيل) بتنفيذ التزام المدين إذا لم يفي به.',
      example: 'شخص يكفل سداد قرض صديقه — إذا لم يدفع الصديق، يتحمل الكفيل الدّين.',
      legalBasis: 'المادة 589 إلى المادة 617 من القانون المدني الجزائري.',
      materialElement: '',
      moralElement: '',
      hook: 'قبل أن تُكفّل أحداً، اعرف حقوقك ومخاطرك القانونية!',
      summary: 'الكفيل يتحمل مسؤولية كاملة عن الدين — المادة 589 ق.م.',
    };
  }

  /* ── الدعوى العمومية / جزائي عام ── */
  if (t.includes('دعوى عمومي') || t.includes('دعوى مدني') || t.includes('نيابة عامة') || t.includes('النيابة')) {
    return {
      caseType: 'جزائي', classification: 'جنحة', crimeNature: 'مادية',
      definition: 'الدعوى العمومية هي الدعوى التي يقيمها المجتمع عن طريق النيابة العامة لمعاقبة مرتكب الجريمة، أما الدعوى المدنية فهي للمطالبة بالتعويض.',
      example: 'في قضية سرقة، تقيم النيابة الدعوى العمومية للمطالبة بالعقوبة، والمتضرر يقيم الدعوى المدنية للتعويض.',
      legalBasis: 'المادة 1 و 2 ق.إ.ج. الدعوى العمومية تُقيمها النيابة تلقائياً في الجنح والجنايات.',
      materialElement: '',
      moralElement: '',
      hook: 'ما الفرق بين الدعوى العمومية والمدنية في المحكمة الجزائية؟',
      summary: 'الدعوى العمومية للعقابة (النيابة)، والدعوى المدنية للتعويض (المتضرر).',
    };
  }

  /* ── الحق في الحياة الخاصة ── */
  if (t.includes('حياة خاص') || t.includes('خصوصية') || t.includes('بيانات شخص') || t.includes('حماية المعطي')) {
    return {
      caseType: 'مدني',
      definition: 'حق الحياة الخاصة مكفول دستورياً في المادة 40 من الدستور الجزائري، ويمنع أي مساس بحرمة الفرد وحقوقه.',
      example: 'نشر صور شخص أو بياناته دون موافقته على وسائل التواصل الاجتماعي — يُعرّض صاحبه للمتابعة.',
      legalBasis: 'المادة 40 من الدستور. المادة 46 من القانون المدني (حماية الحقوق الشخصية). المادة 296 مكرر من قانون العقوبات.',
      materialElement: '',
      moralElement: '',
      hook: 'نشر صورة شخص بدون إذنه جريمة يعاقب عليها القانون!',
      summary: 'الحياة الخاصة حق دستوري محمي — المساس به قد يُعرّضك للمسؤولية الجزائية والمدنية.',
    };
  }

  /* ── التعويض عن الضرر ── */
  if (t.includes('تعويض') || t.includes('ضرر') || t.includes('مسؤولية مدني') || t.includes('مسؤولية تقصيري')) {
    return {
      caseType: 'مدني',
      definition: 'التعويض هو مبلغ مالي يُحكم به لجبر الضرر الذي لحق بشخص بسبب فعل ضار أو إخلال بالتزام. يشمل الضرر المادي والأدبي.',
      example: 'شخص تسبب في حادث مرور أدى إلى إصابة آخر — المحكمة تحكم بتعويض شامل (مادي + أدبي + فقدان مداخيل).',
      legalBasis: 'المادة 124 ق.م (المسؤولية التقصيرية: كل فعل ضار يلزم بالتعويض). المادة 132 ق.م (التعويض عن الضرر الأدبي).',
      materialElement: '',
      moralElement: '',
      hook: 'تعرضت لضرر؟ القانون الجزائري يكفل لك حق التعويض الكامل!',
      summary: 'المسؤولية التقصيرية (م.124 ق.م) تُلزم كل من تسبب في ضرر للغير بالتعويض.',
    };
  }

  /* ── الأمر بالحضور / تكليف بالحضور ── */
  if (t.includes('امر بالحضور') || t.includes('تكليف بالحضور') || t.includes('استدعاء') || t.includes('تبليغ')) {
    return {
      caseType: 'مدني',
      definition: 'التكليف بالحضور هو المحضر القضائي الذي يبلغ به المدعى عليه لتمكينه من الحضور أمام المحكمة. يتم عن طريق محضر قضائي.',
      example: 'المحكمة ترسل تكليف بالحضور إلى المدعى عليه قبل الجلسة بـ 15 يوماً على الأقل.',
      legalBasis: 'المادة 29 ق.إ.م.إ (التكليف بالحضور). المادة 30 (الأجل: لا يقل عن 15 يوماً قبل جلسة المحاكمة).',
      materialElement: '',
      moralElement: '',
      hook: 'لم تستلم تكليف بالحضور؟ قد لا تكون ملزماً بالحضور!',
      summary: 'التكليف بالحضور شرط أساسي لصحة المحاكمة — بدونه لا تُقبل الدعوى.',
    };
  }

  /* ── الإيجار التجاري (شطوان 1975) ── */
  if (t.includes('تجاري') && (t.includes('ايجار') || t.includes('إيجار')) || t.includes('شطوان') || t.includes('1975')) {
    return {
      caseType: 'تجاري',
      definition: 'الإيجار التجاري محكم بمرسوم 1975 الذي يمنح المستأجر التجاري حق البقاء في المحل التجاري وحق التجديد الضمني للعقد.',
      example: 'مستأجر محل تجاري منذ 10 سنوات — له الحق في تجديد العقد تلقائياً وفق مرسوم 1975.',
      legalBasis: 'المرسوم رقم 75-59 المؤرخ في 26 سبتمبر 1975. المادة 2 (حق التجديد الضمني).',
      materialElement: '',
      moralElement: '',
      hook: 'مستأجر محل تجاري ومهدد بالطرد؟ مرسوم 1975 يحميك!',
      summary: 'مرسوم 1975 يمنح المستأجر التجاري حق التجديد الضمني وحماية قوية ضد الطرد التعسفي.',
    };
  }

  /* ── الوصية ── */
  if (t.includes('وصي')) {
    return {
      caseType: 'أحوال شخصية',
      definition: 'الوصية هي تصرف قانوني يُعدّل به الموصي أحكام الميراث بأن يُعين مالاً أو منفعة يؤولان بعد وفاته إلى شخص معين، ضمن حدود الثلث.',
      example: 'شخص يوصي بثلث تركته لجمعية خيرية — الوصية صحيحة ما دامت في حدود الثلث.',
      legalBasis: 'المادة 187 إلى المادة 208 من قانون الأسرة. المادة 199: الوصية لا تجوز لأكثر من ثلث التركة.',
      materialElement: '',
      moralElement: '',
      hook: 'هل تعرف أن الوصية لا تصح لأكثر من ثلث التركة؟',
      summary: 'الوصية تصح في حدود الثلث فقط (م.199 ق.الأسرة) ولا تصح لوارث.',
    };
  }

  /* ── المعارضة ── */
  if (t.includes('معارض')) {
    return {
      caseType: 'مدني',
      definition: 'المعارضة هي طريق طعن في الأحكام الغيابية تُرفع أمام نفس المحكمة التي أصدرت الحكم خلال 15 يوماً من تاريخ التبليغ.',
      example: 'حكم غيابي بالحبس — للمحكوم عليه أن يعارض فيه خلال 15 يوماً من التبليغ.',
      legalBasis: 'المادة 329 إلى المادة 335 ق.إ.م.إ. الأجل: 15 يوماً من تاريخ تبليغ الحكم الغيابي.',
      materialElement: '',
      moralElement: '',
      hook: 'حكم غيابي صدر ضدك؟ لا تقلق، المعارضة حقك القانوني!',
      summary: 'المعارضة تُرفع أمام نفس المحكمة خلال 15 يوماً من تبليغ الحكم الغيابي.',
    };
  }

  /* ── الافراج المشروط ── */
  if (t.includes('افراج') || t.includes('إفراج مشروط') || t.includes('وقف تنفيذ العقوب')) {
    return {
      caseType: 'جزائي', classification: 'جناية', crimeNature: 'مادية',
      definition: 'الإفراج المشروط هو إطلاق سراح المحكوم عليه قبل انتهاء مدة عقوبته إذا كان سلوكه حسناً وقضى ثلث العقوبة على الأقل.',
      example: 'محكوم بـ 6 سنوات سجن، أمضى سنتين بسلوك حسن — يمكنه طلب الإفراج المشروط.',
      legalBasis: 'المادة 136 ق.إ.ج. المادة 608: يشترط قضاء ثلث العقوبة وسلوك حسن.',
      materialElement: '',
      moralElement: '',
      hook: 'هل المحكوم عليه يستحق الإفراج المشروط؟ إليك الشروط!',
      summary: 'الإفراج المشروط يُمنح بعد قضاء ثلث العقوبة بسلوك حسن (م.136 ق.إ.ج).',
    };
  }

  /* ── FALLBACK: Default analysis for unknown topics ── */
  return {
    caseType: 'مدني',
    definition: 'الموضوع ' + String.fromCharCode(171) + topic + String.fromCharCode(187) + ' يتعلق بمسألة قانونية تستوجب الفهم الدقيق لأحكام القانون الجزائري. يتطلب تحليل النص القانوني ومعرفة الاجتهاد القضائي.',
    example: 'حالة عملية من واقع القضايا المعروضة أمام المحاكم الجزائرية في هذا المجال القانوني.',
    legalBasis: 'يُرجع إلى النصوص القانونية المتعلقة بالموضوع في القانون المدني والقانون الإجرائي الجزائري.',
    materialElement: '',
    moralElement: '',
    hook: 'هل تعرف كل ما يتعلق بـ "' + topic + '" في القانون الجزائري؟',
    summary: 'مسألة قانونية تتعلق بـ "' + topic + '" — يُنصح بالرجوع إلى النصوص القانونية والاستشارة المختصة.',
  };
}

/* ═══════════════════════════════════════════════════════
   JSON OUTPUT BUILDER
   ═══════════════════════════════════════════════════════ */

const DESIGN_TYPE_LABELS: Record<DesignType, string> = {
  'vertical-4k': 'Vertical 4K infographic',
  'horizontal': 'Horizontal infographic',
  'carousel': 'Facebook carousel',
};

const STYLE_LABELS: Record<ContentStyle, string> = {
  'simple': 'simple',
  'professional': 'professional',
  'social': 'social',
};

function buildOutput(
  analysis: LegalAnalysis,
  designType: DesignType,
  contentStyle: ContentStyle,
  watermark: string,
): string {
  const output: Record<string, unknown> = {
    design_type: DESIGN_TYPE_LABELS[designType],
    hook: analysis.hook,
    content: {
      definition: analysis.definition,
      example: analysis.example,
      legal_basis: analysis.legalBasis,
      classification: analysis.caseType,
      ...(analysis.caseType === 'جزائي' && analysis.classification && {
        crime_classification: analysis.classification,
        elements: {
          material: analysis.materialElement || 'يُحدد وفق وقائع القضية',
          moral: analysis.moralElement || 'يُحدد وفق نية الجاني',
          ...(analysis.crimeNature && { nature: analysis.crimeNature }),
        },
      }),
      summary: analysis.summary,
    },
    style: STYLE_LABELS[contentStyle],
    watermark: watermark || '',
  };

  return JSON.stringify(output, null, 2);
}

/* ═══════════════════════════════════════════════════════
   LOCALSTORAGE HELPERS
   ═══════════════════════════════════════════════════════ */

const STORAGE_KEY = 'fbnano_history';

function loadHistory(): GeneratedOutput[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(items: GeneratedOutput[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 3)));
  } catch { /* ignore */ }
}

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function NanoBananaBuilder({ onBack }: { onBack: () => void }) {
  const [topic, setTopic] = useState('');
  const [designType, setDesignType] = useState<DesignType>('vertical-4k');
  const [contentStyle, setContentStyle] = useState<ContentStyle>('simple');
  const [watermark, setWatermark] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<GeneratedOutput[]>([]);
  const [showUsage, setShowUsage] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  /* ── Suggest random topic ── */
  const suggestTopic = useCallback(() => {
    const random = HOT_TOPICS[Math.floor(Math.random() * HOT_TOPICS.length)];
    setTopic(random);
  }, []);

  /* ── Generate ── */
  const generate = useCallback(() => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setOutput('');
    setCopied(false);

    // Simulate a brief processing delay for UX
    setTimeout(() => {
      const analysis = detectLegalTopic(topic.trim());
      const json = buildOutput(analysis, designType, contentStyle, watermark.trim());
      setOutput(json);

      const entry: GeneratedOutput = { json, timestamp: Date.now(), topic: topic.trim() };
      const newHistory = [entry, ...history.filter(h => h.topic !== topic.trim())].slice(0, 3);
      setHistory(newHistory);
      saveHistory(newHistory);
      setIsGenerating(false);

      // Scroll to output
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }, 800);
  }, [topic, designType, contentStyle, watermark, history]);

  /* ── Copy ── */
  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [output]);

  /* ── Share WhatsApp ── */
  const shareWhatsApp = useCallback(() => {
    if (!output) return;
    const text = encodeURIComponent(`📊 كود تصميم Nano Banana:\n\n${output}\n\n🔗 افتح Nano Banana والصق الكود!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }, [output]);

  /* ── Regenerate ── */
  const regenerate = useCallback(() => {
    generate();
  }, [generate]);

  /* ── Load from history ── */
  const loadFromHistory = useCallback((item: GeneratedOutput) => {
    setOutput(item.json);
    setCopied(false);
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, []);

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold hover:opacity-70 transition-opacity">→</button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">مولّد تصاميم Nano Banana</h2>
        </div>
        <span className="mr-auto text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full font-bold">أوفلاين</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
        أنشئ تصميماً قانونياً احترافياً في أقل من 30 ثانية — فقط اكتب الموضوع وانسخ الكود!
      </p>

      {/* ── Form ── */}
      <div className="space-y-4">
        {/* 1. Topic */}
        <div>
          <label className="block text-xs font-bold text-[#1a3a5c] dark:text-gray-200 mb-1.5">
            عنوان الموضوع <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='مثال: جريمة خيانة الأمانة في القانون الجزائري'
              className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && generate()}
            />
            <button
              onClick={suggestTopic}
              className="px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex-shrink-0 font-medium text-amber-700 dark:text-amber-400"
              title="اقتراح موضوع تلقائي"
            >
              🔥 اقترح
            </button>
          </div>
        </div>

        {/* 2. Design Type */}
        <div>
          <label className="block text-xs font-bold text-[#1a3a5c] dark:text-gray-200 mb-1.5">نوع التصميم</label>
          <div className="grid grid-cols-3 gap-2">
            {DESIGN_TYPES.map(d => (
              <button
                key={d.id}
                onClick={() => setDesignType(d.id)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${designType === d.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-800'}`}
              >
                <div className="text-lg mb-0.5">{d.icon}</div>
                <div className="text-[11px] font-bold text-[#1a3a5c] dark:text-gray-200">{d.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Content Style */}
        <div>
          <label className="block text-xs font-bold text-[#1a3a5c] dark:text-gray-200 mb-1.5">أسلوب المحتوى</label>
          <div className="grid grid-cols-3 gap-2">
            {CONTENT_STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => setContentStyle(s.id)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${contentStyle === s.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-800'}`}
              >
                <div className="text-lg mb-0.5">{s.icon}</div>
                <div className="text-[11px] font-bold text-[#1a3a5c] dark:text-gray-200">{s.label}</div>
                <div className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Watermark */}
        <div>
          <label className="block text-xs font-bold text-[#1a3a5c] dark:text-gray-200 mb-1.5">اسم صاحب الحقوق (اختياري)</label>
          <input
            type="text"
            value={watermark}
            onChange={(e) => setWatermark(e.target.value)}
            placeholder='مثال: الأستاذ سايج محمد'
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        {/* 5. Generate Button */}
        <button
          onClick={generate}
          disabled={!topic.trim() || isGenerating}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${!topic.trim() ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : isGenerating ? 'bg-emerald-400 text-white animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl active:scale-[0.98]'}`}
        >
          {isGenerating ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/></svg>
              جاري التحليل...
            </>
          ) : (
            <>🚀 توليد الكود (JSON)</>
          )}
        </button>
      </div>

      {/* ── Output ── */}
      {output && (
        <div ref={outputRef} className="mt-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Output header */}
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800 rounded-t-xl px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">📋</span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">الكود جاهز</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={regenerate} className="px-2.5 py-1 text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 font-medium" title="إعادة التوليد">
                🔁 إعادة
              </button>
              <button onClick={shareWhatsApp} className="px-2.5 py-1 text-[10px] bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium" title="مشاركة عبر واتساب">
                📤 واتساب
              </button>
              <button onClick={copyOutput} className={`px-3 py-1 text-[10px] rounded-lg font-bold transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-[#1a3a5c] dark:bg-[#f0c040] dark:text-[#1a3a5c] text-white'}`}>
                {copied ? '✅ تم النسخ!' : '📋 نسخ الكود'}
              </button>
            </div>
          </div>

          {/* JSON Box */}
          <div className="bg-gray-900 dark:bg-gray-950 rounded-b-xl p-4 max-h-80 overflow-y-auto">
            <pre className="text-xs text-emerald-300 font-mono leading-relaxed whitespace-pre-wrap" dir="ltr">{output}</pre>
          </div>
        </div>
      )}

      {/* ── History ── */}
      {history.length > 0 && !output && (
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🕐</span>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">آخر الأكواد المولدة</span>
          </div>
          <div className="space-y-1.5">
            {history.map((item, i) => (
              <button
                key={i}
                onClick={() => loadFromHistory(item)}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all text-right"
              >
                <span className="text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#1a3a5c] dark:text-gray-200 truncate">{item.topic}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{new Date(item.timestamp).toLocaleDateString('ar-DZ')}</div>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">عرض</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Usage Guide ── */}
      <div className="mt-6">
        <button
          onClick={() => setShowUsage(!showUsage)}
          className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800 rounded-xl text-sm"
        >
          <span className="font-bold text-blue-700 dark:text-blue-400">📖 كيف تستعمل الأداة؟</span>
          <span className={`text-gray-400 transition-transform duration-200 ${showUsage ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {showUsage && (
          <div className="mt-2 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 space-y-2 animate-in fade-in duration-200">
            {[
              { step: '1', text: 'اكتب عنوان الموضوع القانوني أو استعمل "اقترح موضوع"' },
              { step: '2', text: 'اختر نوع التصميم (عمودي 4K / أفقي / كاروسيل)' },
              { step: '3', text: 'اختر أسلوب المحتوى (مبسّط / احترافي / تفاعلي)' },
              { step: '4', text: 'اضغط "توليد الكود (JSON)"' },
              { step: '5', text: 'انسخ الكود بزر "نسخ الكود"' },
              { step: '6', text: 'افتح Nano Banana' },
              { step: '7', text: 'الصق الكود واضغط Generate' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{s.step}</span>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{s.text}</p>
              </div>
            ))}
            <div className="mt-3 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 rounded-lg p-2.5 text-center">
              <p className="text-xs text-green-700 dark:text-green-400 font-bold">🟢 النتيجة: تحصل على تصميم قانوني جاهز للنشر مباشرة!</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Privacy Badge ── */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
          <div className="text-xl mb-1">🔒</div>
          <div className="text-[10px] font-bold text-[#1a3a5c] dark:text-gray-200">خصوصية تامة</div>
          <p className="text-[9px] text-gray-500 leading-relaxed">لا يُرسل أي شيء للسيرفر</p>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
          <div className="text-xl mb-1">⚡</div>
          <div className="text-[10px] font-bold text-[#1a3a5c] dark:text-gray-200">يعمل أوفلاين</div>
          <p className="text-[9px] text-gray-500 leading-relaxed">بدون إنترنت</p>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
          <div className="text-xl mb-1">📱</div>
          <div className="text-[10px] font-bold text-[#1a3a5c] dark:text-gray-200">مشاركة سريعة</div>
          <p className="text-[9px] text-gray-500 leading-relaxed">واتساب مباشر</p>
        </div>
      </div>
    </div>
  );
}
