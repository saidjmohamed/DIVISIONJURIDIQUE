'use client';

import { useState, useMemo, useCallback } from 'react';

/* ─────────────────────── Types ─────────────────────── */

type PromptCategory = 'analysis' | 'drafting' | 'research' | 'strategy' | 'translation' | 'learning';

interface Prompt {
  id: string;
  title: string;
  category: PromptCategory;
  description: string;
  prompt: string;
  tags: string[];
}

/* ─────────────────────── Categories ─────────────────────── */

const CATEGORIES: { key: PromptCategory; label: string; icon: string; color: string; bg: string; border: string }[] = [
  { key: 'analysis',    label: 'تحليل القضايا',        icon: '🔍', color: '#2563eb', bg: 'bg-blue-100 dark:bg-blue-900/30',   border: 'border-blue-200 dark:border-blue-800' },
  { key: 'drafting',    label: 'صياغة المستندات',      icon: '✍️', color: '#7c3aed', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800' },
  { key: 'research',    label: 'البحث القانوني',        icon: '📚', color: '#059669', bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800' },
  { key: 'strategy',   label: 'الاستراتيجية والدفاع', icon: '🎯', color: '#dc2626', bg: 'bg-red-100 dark:bg-red-900/30',     border: 'border-red-200 dark:border-red-800' },
  { key: 'translation', label: 'الترجمة القانونية',    icon: '🌐', color: '#d97706', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800' },
  { key: 'learning',   label: 'التعلم والتدريب',      icon: '🎓', color: '#6366f1', bg: 'bg-indigo-100 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-800' },
];

/* ─────────────────────── Prompts Data ─────────────────────── */

const PROMPTS: Prompt[] = [
  /* ── تحليل القضايا ── */
  {
    id: 'analysis-1',
    title: 'تحليل شامل لقضية',
    category: 'analysis',
    description: 'تحليل كامل للوقائع مع التكييف القانوني وتحديد الاستراتيجية المناسبة',
    prompt: `أنت محامٍ جزائري خبير. قم بتحليل القضية التالية تحليلاً شاملاً:

[ألصق وقائع القضية هنا]

المطلوب:
1. تكييف الوقائع قانونياً
2. تحديد المواد القانونية المطبقة من القانون الجزائري
3. تحديد نقاط القوة والضعف في موقف كل طرف
4. اقتراح الاستراتيجية المناسبة للدفاع
5. ذكر الاجتهادات القضائية ذات الصلة (المحكمة العليا / مجلس الدولة)
6. تحديد المحكمة المختصة نوعياً وإقليمياً`,
    tags: ['تحليل', 'تكييف', 'استراتيجية'],
  },
  {
    id: 'analysis-2',
    title: 'تحليل حكم قضائي',
    category: 'analysis',
    description: 'استخراج الوقائع والحيثيات وتقييم صحة الحكم وأوجه الطعن',
    prompt: `أنت خبير في القانون الجزائري. حلل الحكم/القرار التالي:

[ألصق نص الحكم هنا]

استخرج:
1. الوقائع الجوهرية
2. المسائل القانونية المطروحة
3. حيثيات الحكم (الأسباب)
4. المنطوق
5. المواد القانونية المطبقة
6. تقييم: هل الحكم صحيح قانونياً أم يمكن الطعن فيه؟
7. أوجه الطعن المحتملة مع ذكر المواد`,
    tags: ['حكم', 'تحليل', 'طعن'],
  },
  {
    id: 'analysis-3',
    title: 'تقييم فرص نجاح الدعوى',
    category: 'analysis',
    description: 'تقدير نسبة نجاح الدعوى مع تحديد نقاط القوة والضعف والبدائل',
    prompt: `أنت محامٍ جزائري متمرس. بناءً على الوقائع التالية، قيّم فرص نجاح الدعوى:

الوقائع: [اذكر الوقائع]
نوع الدعوى: [مدنية/جزائية/إدارية/تجارية/عمالية/أسرة]
الطلبات: [ما يريده الموكل]

قدم:
1. نسبة تقديرية لفرص النجاح مع التبرير
2. نقاط القوة في الملف
3. نقاط الضعف والمخاطر
4. الأدلة المطلوبة لتعزيز الموقف
5. البدائل الممكنة (صلح، وساطة، تسوية)`,
    tags: ['تقييم', 'فرص', 'استشارة'],
  },
  {
    id: 'analysis-4',
    title: 'تحليل عقد قبل التوقيع',
    category: 'analysis',
    description: 'مراجعة عقد وكشف البنود الخطرة والثغرات قبل إبرامه',
    prompt: `أنت محامٍ جزائري متخصص في العقود. راجع العقد التالي قبل التوقيع عليه:

[ألصق نص العقد هنا]

المطلوب:
1. تحديد البنود الخطرة أو غير المتوازنة
2. الثغرات القانونية التي قد تضر موكلي
3. البنود المخالفة للقانون الجزائري أو النظام العام
4. اقتراح صياغة بديلة لكل بند إشكالي
5. التوصية النهائية: هل يوقّع على العقد كما هو، أم بعد تعديل، أم لا يوقّع؟`,
    tags: ['عقد', 'مراجعة', 'تحليل'],
  },

  /* ── صياغة المستندات ── */
  {
    id: 'drafting-1',
    title: 'صياغة عريضة افتتاحية',
    category: 'drafting',
    description: 'عريضة افتتاحية كاملة وفق قانون الإجراءات المدنية والإدارية 08-09',
    prompt: `أنت محامٍ جزائري. صغ عريضة افتتاحية وفق قانون الإجراءات المدنية والإدارية 08-09:

المحكمة: [اسم المحكمة]
المدعي: [الاسم الكامل، العنوان]
المدعى عليه: [الاسم الكامل، العنوان]
نوع الدعوى: [فسخ عقد / تعويض / إخلاء / ...]
الوقائع: [سرد الوقائع]
الطلبات: [ما يطلبه المدعي]

يجب أن تتضمن العريضة:
- كل البيانات الإلزامية وفق المادة 15 ق.إ.م.إ
- عرض منظم للوقائع
- الأساس القانوني مع ذكر المواد
- الطلبات بشكل واضح ومحدد
- صياغة رسمية باللغة العربية الفصحى`,
    tags: ['عريضة', 'افتتاحية', 'صياغة'],
  },
  {
    id: 'drafting-2',
    title: 'صياغة مذكرة جوابية',
    category: 'drafting',
    description: 'مذكرة جوابية على عريضة الخصم مع الدفوع الشكلية والموضوعية',
    prompt: `أنت محامٍ جزائري متخصص في المرافعات. صغ مذكرة جوابية على العريضة التالية:

نص العريضة أو ملخصها: [ألصق هنا]
موقف موكلي: [اشرح موقف المدعى عليه]
الدفوع المتاحة: [إن وُجدت]

يجب أن تتضمن المذكرة:
1. الرد على كل ادعاء بشكل منفصل
2. الدفوع الشكلية (إن وُجدت): عدم الاختصاص، عدم القبول، التقادم
3. الدفوع الموضوعية مع الأساس القانوني
4. طلبات ختامية واضحة
5. المراجع القانونية (مواد + اجتهادات)`,
    tags: ['مذكرة', 'جوابية', 'دفاع'],
  },
  {
    id: 'drafting-3',
    title: 'صياغة عقد',
    category: 'drafting',
    description: 'صياغة عقد محكم وفق القانون المدني الجزائري يحمي مصالح موكلك',
    prompt: `أنت محامٍ جزائري متخصص في العقود. صغ عقد [بيع/إيجار/عمل/شراكة/...]:

الأطراف:
- الطرف الأول: [البيانات]
- الطرف الثاني: [البيانات]
المحل: [وصف محل العقد]
الثمن/المقابل: [المبلغ أو المقابل]
المدة: [إن وُجدت]
شروط خاصة: [أي شروط إضافية]

يجب أن يتضمن العقد:
- كل الأركان الجوهرية وفق القانون المدني الجزائري (م.54 وما بعدها)
- بنود الضمان والمسؤولية
- شروط الفسخ والإنهاء
- بند حل النزاعات
- أي بنود خاصة بنوع العقد`,
    tags: ['عقد', 'صياغة', 'مدني'],
  },
  {
    id: 'drafting-4',
    title: 'صياغة شكوى جزائية',
    category: 'drafting',
    description: 'شكوى موجهة لوكيل الجمهورية وفق المادة 36 ق.إ.ج',
    prompt: `أنت محامٍ جزائري. صغ شكوى موجهة إلى السيد وكيل الجمهورية:

الشاكي: [البيانات الكاملة]
المشتكى منه: [البيانات إن كانت معلومة]
الوقائع: [سرد تفصيلي: متى، أين، كيف]
التكييف القانوني المحتمل: [نوع الجريمة]
الأدلة: [الوثائق والشهود المتاحة]
الضرر: [وصف الضرر اللاحق]

يجب أن تتضمن الشكوى:
- البيانات وفق المادة 36 ق.إ.ج
- سرد منظم للوقائع
- الإشارة للمواد الجزائية المنطبقة
- طلبات واضحة (متابعة، تعويض)`,
    tags: ['شكوى', 'جزائي', 'نيابة'],
  },
  {
    id: 'drafting-5',
    title: 'صياغة طعن بالاستئناف',
    category: 'drafting',
    description: 'عريضة استئناف مسببة وفق المادة 540 ق.إ.م.إ',
    prompt: `أنت محامٍ جزائري. صغ عريضة استئناف ضد الحكم التالي:

الحكم المستأنف: [رقمه، تاريخه، المحكمة المصدرة]
منطوق الحكم: [ما قضى به]
أسباب الاستئناف: [لماذا نستأنف]

يجب أن تتضمن العريضة:
- البيانات وفق المادة 540 ق.إ.م.إ
- أوجه الاستئناف مرتبة ومسببة
- الأساس القانوني لكل وجه
- الطلبات الختامية
- الإشارة لإرفاق نسخة الحكم (م.541)`,
    tags: ['استئناف', 'طعن', 'صياغة'],
  },

  /* ── البحث القانوني ── */
  {
    id: 'research-1',
    title: 'بحث في المواد القانونية',
    category: 'research',
    description: 'استخراج كل المواد المتعلقة بموضوع معين مع شرحها وتطبيقاتها',
    prompt: `أنت خبير في القانون الجزائري. أريد بحثاً معمقاً حول:

الموضوع: [حدد الموضوع بدقة]
القانون المعني: [ق.م / ق.إ.م.إ / ق.إ.ج / ق.ع / ق.أ / ق.ت / ...]

قدم:
1. كل المواد القانونية المتعلقة بالموضوع مع نصها الكامل
2. التعديلات التي طرأت عليها
3. شرح مبسط لكل مادة
4. العلاقة بين المواد المختلفة
5. التطبيق العملي في القضاء الجزائري
6. الاجتهادات القضائية ذات الصلة`,
    tags: ['بحث', 'مواد', 'قانون'],
  },
  {
    id: 'research-2',
    title: 'بحث عن الاجتهاد القضائي',
    category: 'research',
    description: 'رصد أهم قرارات المحكمة العليا ومجلس الدولة حول مسألة قانونية',
    prompt: `أنت باحث قانوني جزائري. ابحث عن الاجتهاد القضائي حول:

المسألة القانونية: [حددها بدقة]
الجهة القضائية: [المحكمة العليا / مجلس الدولة / الكل]
الفترة: [إن أمكن]

قدم:
1. أهم القرارات المبدئية في هذا الموضوع
2. تطور الاجتهاد القضائي عبر الزمن
3. الموقف الحالي المستقر عليه
4. هل هناك تضارب في الاجتهاد؟
5. نصوص القرارات المهمة (أو ملخصاتها)`,
    tags: ['اجتهاد', 'محكمة عليا', 'بحث'],
  },
  {
    id: 'research-3',
    title: 'مقارنة بين نصوص قانونية',
    category: 'research',
    description: 'تحليل مقارن بين مادتين أو نصين قانونيين لتحديد أيهما ينطبق',
    prompt: `أنت خبير في القانون المقارن الجزائري. قارن بين:

النص الأول: [المادة/القانون]
النص الثاني: [المادة/القانون]

المطلوب:
1. نص كل مادة كاملاً
2. أوجه التشابه والاختلاف
3. نطاق تطبيق كل نص
4. أيهما ينطبق على حالة [وصف الحالة]
5. موقف الاجتهاد القضائي من العلاقة بينهما`,
    tags: ['مقارنة', 'تفسير', 'نصوص'],
  },

  /* ── الاستراتيجية والدفاع ── */
  {
    id: 'strategy-1',
    title: 'بناء استراتيجية دفاع',
    category: 'strategy',
    description: 'خطة دفاع متكاملة بتحليل SWOT وترتيب الدفوع حسب الأولوية',
    prompt: `أنت محامٍ جزائري ذو خبرة 20 سنة. ساعدني في بناء استراتيجية دفاع:

نوع القضية: [مدنية/جزائية/إدارية]
موقف موكلي: [مدعي/مدعى عليه/متهم]
الوقائع: [ملخص]
الأدلة المتاحة: [ما لدينا]
أدلة الخصم: [ما لدى الطرف الآخر]

قدم:
1. تحليل SWOT للموقف القانوني
2. الخيارات الاستراتيجية المتاحة (هجوم/دفاع/تسوية)
3. ترتيب الدفوع حسب الأولوية
4. الأسئلة التي يجب طرحها في المرافعة
5. السيناريوهات المحتملة وكيفية التعامل مع كل منها
6. خطة بديلة في حالة الفشل`,
    tags: ['استراتيجية', 'دفاع', 'تخطيط'],
  },
  {
    id: 'strategy-2',
    title: 'تحضير أسئلة لاستجواب شاهد',
    category: 'strategy',
    description: 'أسئلة مرتبة ومنطقية لاستجواب شاهد الإثبات أو النفي في الجلسة',
    prompt: `أنت محامٍ جزائري متمرس في المرافعات. حضّر أسئلة لاستجواب شاهد:

القضية: [ملخص]
نوع الشاهد: [شاهد إثبات/نفي/خبير]
الهدف من الاستجواب: [ما نريد إثباته أو نفيه]
ما نعرفه عن شهادته: [ملخص]

قدم:
1. أسئلة تمهيدية (لبناء المصداقية أو زعزعتها)
2. أسئلة جوهرية مرتبة منطقياً
3. أسئلة فخ (لكشف التناقضات)
4. أسئلة ختامية (لتثبيت النقاط المهمة)
5. نصائح حول أسلوب طرح الأسئلة`,
    tags: ['استجواب', 'شاهد', 'مرافعة'],
  },
  {
    id: 'strategy-3',
    title: 'إعداد مرافعة شفوية',
    category: 'strategy',
    description: 'مرافعة شفوية مقنعة ومنظمة تبدأ بمقدمة قوية وتنتهي بطلبات واضحة',
    prompt: `أنت محامٍ جزائري بليغ. ساعدني في إعداد مرافعة شفوية:

القضية: [ملخص الوقائع]
الجهة القضائية: [محكمة/مجلس/محكمة عليا]
موقفي: [مدعي/مدعى عليه/نيابة]
النقاط الأساسية: [ما أريد التركيز عليه]
الوقت المتاح: [تقريباً]

قدم مرافعة تتضمن:
1. مقدمة قوية تجذب انتباه القاضي
2. عرض منظم للوقائع
3. التحليل القانوني مع ذكر المواد
4. الرد على حجج الخصم
5. خاتمة مؤثرة مع الطلبات`,
    tags: ['مرافعة', 'شفوية', 'إعداد'],
  },
  {
    id: 'strategy-4',
    title: 'تقييم عرض الصلح',
    category: 'strategy',
    description: 'تقييم موضوعي لعرض التسوية أو الصلح مع المقارنة بالمسار القضائي',
    prompt: `أنت محامٍ جزائري مستشار. ساعدني في تقييم عرض الصلح التالي:

القضية: [ملخص النزاع]
عرض الصلح: [ما يقترحه الطرف الآخر]
موقفنا القانوني: [قوة الملف]
التكاليف والوقت إذا واصلنا التقاضي: [التقديرات]

قدم:
1. تقييم موضوعي لعرض الصلح (هل هو منصف؟)
2. مقارنة بين السيناريوهين: القبول مقابل الرفض
3. هل يمكن التفاوض على شروط أفضل؟
4. اقتراح بند لصياغة الصلح القضائي
5. التوصية النهائية مع التبرير`,
    tags: ['صلح', 'تسوية', 'تفاوض'],
  },

  /* ── الترجمة القانونية ── */
  {
    id: 'translation-1',
    title: 'ترجمة نص قانوني عربي-فرنسي',
    category: 'translation',
    description: 'ترجمة دقيقة للنصوص القانونية بالمصطلحات الرسمية المعتمدة في الجزائر',
    prompt: `أنت مترجم قانوني متخصص في القانون الجزائري (عربي-فرنسي). ترجم النص التالي:

[ألصق النص هنا]

الاتجاه: [عربي→فرنسي / فرنسي→عربي]

تعليمات:
1. استخدم المصطلحات القانونية الرسمية المعتمدة في الجزائر
2. حافظ على الأسلوب القانوني الرسمي
3. اذكر المصطلح البديل إن وُجد
4. لا تترجم أسماء الأعلام والمحاكم حرفياً
5. أضف هوامش توضيحية عند الحاجة`,
    tags: ['ترجمة', 'فرنسي', 'مصطلحات'],
  },
  {
    id: 'translation-2',
    title: 'شرح مصطلح قانوني',
    category: 'translation',
    description: 'تعريف شامل لمصطلح قانوني مع مقابله الفرنسي والأساس القانوني والأمثلة',
    prompt: `أنت أستاذ قانون جزائري. اشرح المصطلح التالي شرحاً شاملاً:

المصطلح: [بالعربية]

قدم:
1. التعريف القانوني الدقيق
2. المقابل بالفرنسية
3. الأساس القانوني (المادة والقانون)
4. أمثلة عملية من القضاء الجزائري
5. المصطلحات المرتبطة
6. الفرق بينه وبين المصطلحات المشابهة`,
    tags: ['مصطلح', 'شرح', 'تعريف'],
  },

  /* ── التعلم والتدريب ── */
  {
    id: 'learning-1',
    title: 'شرح مادة قانونية',
    category: 'learning',
    description: 'شرح مبسط لمادة قانونية مع الحكمة منها وأمثلة عملية وموقف الاجتهاد',
    prompt: `أنت أستاذ قانون في جامعة جزائرية. اشرح المادة التالية شرحاً مبسطاً:

المادة: [رقم المادة والقانون]
نص المادة: [إن كان متاحاً]

قدم:
1. شرح مبسط بلغة سهلة
2. الحكمة من النص (لماذا وُضع)
3. شروط تطبيقه
4. أمثلة عملية (3 حالات على الأقل)
5. الاستثناءات إن وُجدت
6. علاقته بمواد أخرى
7. موقف الاجتهاد القضائي`,
    tags: ['شرح', 'مادة', 'تعليم'],
  },
  {
    id: 'learning-2',
    title: 'إعداد استشارة قانونية',
    category: 'learning',
    description: 'استشارة قانونية مكتوبة متكاملة بالرأي القانوني والخيارات والتوصية',
    prompt: `أنت محامٍ جزائري استشاري. أعد استشارة قانونية مكتوبة:

السؤال المطروح من الموكل: [ألصق السؤال]
المجال: [مدني/جزائي/إداري/تجاري/أسرة/عمل]
الوقائع: [إن وُجدت]

قدم استشارة تتضمن:
1. تحليل الموقف القانوني
2. النصوص القانونية المنطبقة
3. الاجتهاد القضائي ذو الصلة
4. الرأي القانوني مع التبرير
5. الخيارات المتاحة مع إيجابيات وسلبيات كل خيار
6. التوصية النهائية
7. التحفظات والملاحظات`,
    tags: ['استشارة', 'رأي', 'موكل'],
  },
  {
    id: 'learning-3',
    title: 'تحضير لامتحان مهني (CAPA)',
    category: 'learning',
    description: 'ملخص شامل وأسئلة نموذجية للتحضير لامتحان الكفاءة المهنية للمحاماة',
    prompt: `أنت أستاذ متخصص في التحضير لامتحان الكفاءة المهنية للمحاماة في الجزائر (CAPA).

المادة: [قانون مدني/جزائي/إداري/تجاري/إجراءات/...]
الموضوع المحدد: [حدده]

قدم:
1. ملخص شامل للموضوع
2. النقاط التي يركز عليها الامتحان عادة
3. المواد القانونية الأساسية الواجب حفظها
4. 5 أسئلة نموذجية مع أجوبتها
5. نصائح للإجابة في الامتحان
6. الأخطاء الشائعة التي يجب تجنبها`,
    tags: ['امتحان', 'CAPA', 'تحضير'],
  },
  {
    id: 'learning-4',
    title: 'حساب الآجال القانونية',
    category: 'learning',
    description: 'حساب دقيق لآجال الطعون والإجراءات مع ذكر المواد والعواقب القانونية',
    prompt: `أنت خبير في الإجراءات القضائية الجزائرية. احسب الآجال التالية:

نوع الإجراء: [استئناف/نقض/معارضة/تظلم/تنفيذ/...]
تاريخ التبليغ أو الواقعة: [حدد التاريخ]
ظروف خاصة: [عطلة / مسافة / ...]

قدم:
1. الأجل القانوني مع ذكر المادة
2. تاريخ بداية سريان الأجل
3. تاريخ انتهاء الأجل
4. هل يمتد الأجل في حالة العطل والأعياد
5. العواقب القانونية لفوات الأجل
6. هل يمكن التمديد أو التصحيح`,
    tags: ['آجال', 'حساب', 'مواعيد'],
  },
];

/* ─────────────────────── Helpers ─────────────────────── */

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي');
}

function promptMatches(p: Prompt, query: string): boolean {
  const q = normalize(query);
  return (
    normalize(p.title).includes(q) ||
    normalize(p.description).includes(q) ||
    normalize(p.prompt).includes(q) ||
    p.tags.some((t) => normalize(t).includes(q))
  );
}

function getCategoryMeta(key: PromptCategory) {
  return CATEGORIES.find((c) => c.key === key)!;
}

/* ─────────────────────── Sub-components ─────────────────────── */

function Toast({ visible }: { visible: boolean }) {
  return (
    <div
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#8b5cf6] text-white text-sm font-medium shadow-lg shadow-violet-500/30 transition-all duration-300 pointer-events-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      تم النسخ ✅
    </div>
  );
}

function IntroCard() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`mb-5 rounded-xl border overflow-hidden transition-all duration-200 ${
        open
          ? 'border-[#8b5cf6]/40 dark:border-violet-700/50 shadow-sm shadow-violet-100/50 dark:shadow-none'
          : 'border-gray-200 dark:border-gray-700 hover:border-[#8b5cf6]/30 dark:hover:border-violet-700/30'
      }`}
      style={{ borderLeftWidth: '3px', borderLeftColor: '#8b5cf6' }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-right bg-white dark:bg-gray-800"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">💡</span>
          <span className="text-sm font-bold text-[#1a3a5c] dark:text-gray-100">ما هو البرومبت؟</span>
          <span className="text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800 px-2 py-0.5 rounded-full">
            اقرأ أولاً
          </span>
        </div>
        <span
          className={`text-gray-400 dark:text-gray-500 text-xs flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            البرومبت <span className="text-[#8b5cf6] font-semibold">(Prompt)</span> هو التعليمة أو الأمر الذي تعطيه لنموذج الذكاء الاصطناعي (مثل ChatGPT أو Gemini أو Claude) للحصول على نتيجة دقيقة ومفيدة.
          </p>

          <div className="bg-violet-50 dark:bg-violet-900/15 border border-violet-100 dark:border-violet-800 rounded-lg px-3 py-3 space-y-2">
            <p className="text-xs font-bold text-violet-700 dark:text-violet-400 mb-2">💡 نصائح للحصول على أفضل النتائج:</p>
            {[
              { n: '1', title: 'كن محدداً', text: 'بدل "اكتب لي عريضة" → "اكتب عريضة افتتاحية أمام محكمة حسين داي في دعوى فسخ عقد إيجار سكني"' },
              { n: '2', title: 'حدد السياق', text: 'اذكر دائماً أنك محامٍ جزائري وأن القانون المطبق هو القانون الجزائري' },
              { n: '3', title: 'اذكر المراجع', text: 'اطلب ذكر المواد القانونية والاجتهادات القضائية' },
              { n: '4', title: 'راجع النتيجة', text: 'الذكاء الاصطناعي أداة مساعدة وليس بديلاً عن خبرة المحامي — راجع دائماً صحة المواد المذكورة' },
            ].map((tip) => (
              <div key={tip.n} className="flex gap-2">
                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0 w-4">{tip.n}.</span>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  <span className="font-semibold text-violet-700 dark:text-violet-400">{tip.title}:</span>{' '}
                  {tip.text}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 flex gap-2">
            <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-bold">تنبيه مهم:</span> لا تشارك أبداً بيانات الموكلين الحقيقية مع أي نموذج ذكاء اصطناعي. استخدم أسماء وهمية وبيانات معدّلة.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface PromptCardProps {
  p: Prompt;
  onCopy: (text: string) => void;
}

function PromptCard({ p, onCopy }: PromptCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cat = getCategoryMeta(p.category);

  const lines = p.prompt.split('\n');
  const previewLines = lines.slice(0, 4);
  const hasMore = lines.length > 4;
  const displayedText = expanded ? p.prompt : previewLines.join('\n') + (hasMore ? '\n...' : '');

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-all duration-200 ${
        expanded
          ? 'border-[#8b5cf6]/40 dark:border-violet-700/50 shadow-sm shadow-violet-100/50 dark:shadow-none'
          : 'border-gray-200 dark:border-gray-700 hover:border-[#8b5cf6]/30 dark:hover:border-violet-700/30'
      }`}
    >
      {/* Card header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[#1a3a5c] dark:text-gray-100">{p.title}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${cat.bg} ${cat.border}`}
                style={{ color: cat.color }}
              >
                {cat.icon} {cat.label}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{p.description}</p>
          </div>
        </div>

        {/* Prompt text block */}
        <div className="mt-2 relative">
          <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 font-mono text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
            {displayedText}
          </div>

          {/* Expand/collapse toggle */}
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-[11px] text-[#8b5cf6] dark:text-violet-400 hover:underline"
            >
              {expanded ? 'عرض أقل ▲' : 'عرض الكل ▼'}
            </button>
          )}
        </div>

        {/* Footer: tags + copy */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {p.tags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
          <button
            onClick={() => onCopy(p.prompt)}
            className="flex-shrink-0 flex items-center gap-1 text-[11px] bg-[#8b5cf6] hover:bg-violet-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            <span>📋</span>
            <span>نسخ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Main Component ─────────────────────── */

export default function AiPromptsGuide({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastTimer, setToastTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).catch(() => {
        /* fallback: no-op */
      });
      if (toastTimer) clearTimeout(toastTimer);
      setToastVisible(true);
      const t = setTimeout(() => setToastVisible(false), 2000);
      setToastTimer(t);
    },
    [toastTimer],
  );

  const filteredPrompts = useMemo(() => {
    return PROMPTS.filter((p) => {
      const matchesSearch = search.trim() ? promptMatches(p, search.trim()) : true;
      const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PROMPTS.forEach((p) => {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold"
          aria-label="العودة"
        >
          →
        </button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">
          🤖 دليل برومبتات الذكاء الاصطناعي
        </h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
        {PROMPTS.length} برومبت جاهز للاستخدام — انسخ وعدّل وأرسل مباشرةً لنموذج الذكاء الاصطناعي
      </p>

      {/* Introduction card */}
      <IntroCard />

      {/* Search bar */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="ابحث في العنوان، الوصف، نص البرومبت أو الوسوم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 pr-9 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
            aria-label="مسح البحث"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`text-[11px] px-3 py-1 rounded-full border transition-all font-medium ${
            !selectedCategory
              ? 'bg-[#8b5cf6] text-white border-[#8b5cf6]'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#8b5cf6]/40'
          }`}
        >
          الكل ({PROMPTS.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = categoryCounts[cat.key] ?? 0;
          const isSelected = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(isSelected ? null : cat.key)}
              className={`text-[11px] px-3 py-1 rounded-full border transition-all font-medium ${
                isSelected
                  ? 'bg-[#8b5cf6] text-white border-[#8b5cf6]'
                  : `${cat.bg} ${cat.border} hover:opacity-80`
              }`}
              style={isSelected ? {} : { color: cat.color }}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Results count + clear */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {filteredPrompts.length === PROMPTS.length
            ? `${PROMPTS.length} برومبت`
            : `${filteredPrompts.length} من ${PROMPTS.length} برومبت`}
        </span>
        {(search || selectedCategory) && (
          <button
            onClick={() => { setSearch(''); setSelectedCategory(null); }}
            className="text-[11px] text-[#8b5cf6] dark:text-violet-400 hover:underline"
          >
            مسح الفلتر
          </button>
        )}
      </div>

      {/* Prompts list */}
      {filteredPrompts.length > 0 ? (
        <div className="space-y-3">
          {filteredPrompts.map((p) => (
            <PromptCard key={p.id} p={p} onCopy={handleCopy} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            لا توجد نتائج{search ? ` لـ "${search}"` : ''}
            {selectedCategory
              ? ` في تصنيف "${getCategoryMeta(selectedCategory).label}"`
              : ''}
          </p>
          <button
            onClick={() => { setSearch(''); setSelectedCategory(null); }}
            className="mt-2 text-xs text-[#8b5cf6] dark:text-violet-400 hover:underline"
          >
            مسح البحث
          </button>
        </div>
      )}

      {/* Stats footer */}
      <div className="mt-6 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800 rounded-xl p-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'إجمالي البرومبتات', value: PROMPTS.length },
            { label: 'تصنيفات', value: CATEGORIES.length },
            { label: 'نتائج الفلتر', value: filteredPrompts.length },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-base font-bold text-[#8b5cf6] dark:text-violet-400">{stat.value}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage note */}
      <p className="mt-3 text-[10px] text-center text-gray-400 dark:text-gray-600 leading-relaxed">
        الكلمات بين [أقواس] هي حقول قابلة للتعديل — عدّلها قبل الإرسال للنموذج
      </p>

      {/* Copy toast */}
      <Toast visible={toastVisible} />
    </div>
  );
}
