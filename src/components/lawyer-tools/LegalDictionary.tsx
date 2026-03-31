'use client';

import { useState, useMemo } from 'react';

/* ─────────────────────── Types ─────────────────────── */

interface LegalTerm {
  ar: string;
  fr: string;
  def: string;
  category: string;
}

/* ─────────────────────── Data ─────────────────────── */

const LEGAL_TERMS: LegalTerm[] = [
  // إجراءات
  { ar: 'الاختصاص الإقليمي', fr: 'Compétence territoriale', def: 'صلاحية المحكمة من حيث المكان للفصل في النزاع', category: 'إجراءات' },
  { ar: 'الاختصاص النوعي', fr: 'Compétence d\'attribution / matérielle', def: 'صلاحية المحكمة من حيث نوع القضية', category: 'إجراءات' },
  { ar: 'الدفع بعدم القبول', fr: 'Fin de non-recevoir', def: 'دفع يرمي إلى التصريح بعدم قبول الدعوى لانعدام شرط من شروطها (م.67 ق.إ.م.إ)', category: 'إجراءات' },
  { ar: 'الدفع الشكلي', fr: 'Exception de procédure', def: 'دفع يهدف إلى إبطال إجراء لعيب شكلي', category: 'إجراءات' },
  { ar: 'التكليف بالحضور', fr: 'Assignation / Citation', def: 'إجراء إعلام الخصم بالدعوى رسمياً عن طريق محضر قضائي', category: 'إجراءات' },
  { ar: 'الاستعجال', fr: 'Référé', def: 'إجراء يتخذ في حالة الاستعجال أمام قاضي الاستعجال للأمر بتدابير مؤقتة (م.299 ق.إ.م.إ)', category: 'إجراءات' },
  { ar: 'الأمر على عريضة', fr: 'Ordonnance sur requête', def: 'أمر يصدره القاضي بناء على طلب من طرف واحد دون مواجهة (م.310 ق.إ.م.إ)', category: 'إجراءات' },
  { ar: 'الانعقاد', fr: 'Formation de la juridiction', def: 'اكتمال تشكيل الهيئة القضائية المختصة للفصل في الدعوى', category: 'إجراءات' },
  { ar: 'التأجيل', fr: 'Renvoi / Ajournement', def: 'تأجيل النظر في القضية إلى جلسة لاحقة بقرار من القاضي أو بطلب الأطراف', category: 'إجراءات' },
  { ar: 'الإدخال في الدعوى', fr: 'Intervention forcée', def: 'إدخال طرف ثالث في الخصومة رغماً عنه لارتباط مصالحه بها (م.209 ق.إ.م.إ)', category: 'إجراءات' },
  { ar: 'التدخل الاختياري', fr: 'Intervention volontaire', def: 'تدخل طرف ثالث في الدعوى بمبادرة منه لحماية حقوقه (م.208 ق.إ.م.إ)', category: 'إجراءات' },
  { ar: 'المداولة', fr: 'Délibéré', def: 'مرحلة تشاور القضاة لإصدار الحكم بعد انتهاء المرافعات', category: 'إجراءات' },
  // تنفيذ
  { ar: 'الصيغة التنفيذية', fr: 'Formule exécutoire', def: 'العبارة التي توضع على الحكم لتمكين تنفيذه جبراً', category: 'تنفيذ' },
  { ar: 'الحجز التحفظي', fr: 'Saisie conservatoire', def: 'إجراء وقائي يهدف لتأمين حقوق الدائن بمنع المدين من التصرف في أمواله', category: 'تنفيذ' },
  { ar: 'الحجز التنفيذي', fr: 'Saisie-exécution', def: 'حجز يتم بعد صدور حكم نهائي لتنفيذه على أموال المحكوم عليه', category: 'تنفيذ' },
  { ar: 'النفاذ المعجل', fr: 'Exécution provisoire', def: 'تنفيذ الحكم قبل أن يصبح نهائياً (م.323 ق.إ.م.إ)', category: 'تنفيذ' },
  { ar: 'إشكالات التنفيذ', fr: 'Difficultés d\'exécution', def: 'المنازعات التي تثار أثناء تنفيذ الحكم (م.631 ق.إ.م.إ)', category: 'تنفيذ' },
  { ar: 'الحجز لدى الغير', fr: 'Saisie-attribution', def: 'حجز على مبالغ مالية مستحقة للمدين لدى طرف ثالث (بنك، صاحب عمل)', category: 'تنفيذ' },
  { ar: 'البيع القضائي', fr: 'Vente judiciaire', def: 'بيع أموال المحكوم عليه عن طريق القضاء لاستيفاء الدين', category: 'تنفيذ' },
  // عقود
  { ar: 'التراضي', fr: 'Consentement', def: 'توافق إرادتي المتعاقدين كركن من أركان العقد (م.59 ق.م)', category: 'عقود' },
  { ar: 'الغلط', fr: 'Erreur', def: 'عيب من عيوب الإرادة يؤدي إلى إبطال العقد (م.81 ق.م)', category: 'عقود' },
  { ar: 'التدليس', fr: 'Dol', def: 'استعمال طرق احتيالية لإيقاع المتعاقد الآخر في غلط يدفعه للتعاقد (م.86 ق.م)', category: 'عقود' },
  { ar: 'الإكراه', fr: 'Violence / Contrainte', def: 'إجبار شخص على التعاقد بالتهديد (م.88 ق.م)', category: 'عقود' },
  { ar: 'الفسخ', fr: 'Résolution', def: 'إنهاء العقد بسبب عدم تنفيذ أحد طرفيه لالتزاماته (م.119 ق.م)', category: 'عقود' },
  { ar: 'الإبطال', fr: 'Annulation', def: 'إلغاء العقد بسبب عيب في الركن أو شرط الصحة مع أثر رجعي', category: 'عقود' },
  { ar: 'الغبن', fr: 'Lésion', def: 'عدم التعادل الفاحش في المقابل بين التزامات طرفي العقد (م.90 ق.م)', category: 'عقود' },
  // عقار
  { ar: 'الشفعة', fr: 'Préemption / Retrait', def: 'حق يخول صاحبه أن يحل محل المشتري في عقد بيع تم (م.794 ق.م)', category: 'عقار' },
  { ar: 'الحيازة', fr: 'Possession', def: 'السيطرة الفعلية على شيء بنية تملكه (م.808 ق.م)', category: 'عقار' },
  { ar: 'التقادم المكسب', fr: 'Prescription acquisitive', def: 'كسب الملكية بالحيازة المستمرة لمدة 15 سنة (م.827 ق.م)', category: 'عقار' },
  { ar: 'الارتفاق', fr: 'Servitude', def: 'حق عيني على عقار الغير لمنفعة عقار آخر (م.864 ق.م)', category: 'عقار' },
  { ar: 'دعوى الاسترداد', fr: 'Action en revendication', def: 'دعوى يرفعها المالك لاسترداد ملكيته من يد حائزها', category: 'عقار' },
  // التزامات
  { ar: 'التقادم المسقط', fr: 'Prescription extinctive', def: 'انقضاء الحق بمرور المدة القانونية دون المطالبة به (م.308 ق.م: 15 سنة)', category: 'التزامات' },
  { ar: 'المسؤولية التقصيرية', fr: 'Responsabilité délictuelle', def: 'المسؤولية الناشئة عن الفعل الضار خارج نطاق العقد (م.124 ق.م)', category: 'التزامات' },
  { ar: 'المسؤولية العقدية', fr: 'Responsabilité contractuelle', def: 'المسؤولية الناشئة عن الإخلال بالتزام عقدي', category: 'التزامات' },
  { ar: 'الإثراء بلا سبب', fr: 'Enrichissement sans cause', def: 'التزام من يثري بلا سبب مشروع بالتعويض عمن افتقر على حسابه (م.141 ق.م)', category: 'التزامات' },
  { ar: 'الحلول', fr: 'Subrogation', def: 'حلول شخص محل آخر في حقوقه تجاه المدين بعد أن يفي بالدين عنه (م.250 ق.م)', category: 'التزامات' },
  { ar: 'المقاصة', fr: 'Compensation', def: 'انقضاء الديون المتقابلة حتى المبلغ الأقل منها (م.297 ق.م)', category: 'التزامات' },
  // جزائي
  { ar: 'الدعوى العمومية', fr: 'Action publique', def: 'الدعوى التي يقيمها المجتمع عن طريق النيابة لمعاقبة المجرم (م.1 ق.إ.ج)', category: 'جزائي' },
  { ar: 'الدعوى المدنية', fr: 'Action civile', def: 'دعوى التعويض المقامة من المتضرر من الجريمة (م.2 ق.إ.ج)', category: 'جزائي' },
  { ar: 'الحبس المؤقت', fr: 'Détention provisoire', def: 'إيداع المتهم الحبس خلال مرحلة التحقيق (م.123 ق.إ.ج)', category: 'جزائي' },
  { ar: 'الرقابة القضائية', fr: 'Contrôle judiciaire', def: 'إجراء بديل عن الحبس المؤقت يفرض التزامات على المتهم (م.125 مكرر ق.إ.ج)', category: 'جزائي' },
  { ar: 'الكفالة', fr: 'Caution / Cautionnement', def: 'مبلغ مالي يودعه المتهم ضماناً لحضوره (م.127 ق.إ.ج)', category: 'جزائي' },
  { ar: 'وقف التنفيذ', fr: 'Sursis à l\'exécution', def: 'تعليق تنفيذ العقوبة لفترة اختبار (م.592 ق.إ.ج)', category: 'جزائي' },
  { ar: 'الظروف المخففة', fr: 'Circonstances atténuantes', def: 'ظروف يأخذها القاضي بعين الاعتبار لتخفيف العقوبة دون النزول إلى أدنى الحد القانوني', category: 'جزائي' },
  { ar: 'الإفراج المشروط', fr: 'Liberté conditionnelle', def: 'الإفراج عن المحكوم عليه قبل انتهاء عقوبته مع خضوعه لشروط معينة (م.136 ق.إ.ج)', category: 'جزائي' },
  // طعون
  { ar: 'التماس إعادة النظر', fr: 'Recours en révision', def: 'طعن غير عادي في حكم نهائي بسبب اكتشاف واقعة جديدة (م.390 ق.إ.م.إ)', category: 'طعون' },
  { ar: 'اعتراض الغير الخارج عن الخصومة', fr: 'Tierce opposition', def: 'طعن يقدمه شخص لم يكن طرفاً في الدعوى وتضرر من الحكم (م.380 ق.إ.م.إ)', category: 'طعون' },
  { ar: 'الطعن بالنقض', fr: 'Pourvoi en cassation', def: 'طعن أمام المحكمة العليا في الأحكام النهائية لمخالفة القانون (م.349 ق.إ.م.إ)', category: 'طعون' },
  { ar: 'الاستئناف', fr: 'Appel', def: 'طعن في حكم ابتدائي أمام درجة قضائية أعلى (م.336 ق.إ.م.إ)', category: 'طعون' },
  { ar: 'المعارضة', fr: 'Opposition', def: 'طعن في حكم غيابي أمام نفس المحكمة المصدرة له (م.329 ق.إ.م.إ)', category: 'طعون' },
  // طرق بديلة
  { ar: 'الوساطة', fr: 'Médiation', def: 'طريقة بديلة لحل النزاعات بتدخل وسيط محايد (م.994 ق.إ.م.إ)', category: 'طرق بديلة' },
  { ar: 'الصلح', fr: 'Conciliation', def: 'اتفاق الأطراف على إنهاء النزاع ودياً (م.990 ق.إ.م.إ)', category: 'طرق بديلة' },
  { ar: 'التحكيم', fr: 'Arbitrage', def: 'عرض النزاع على محكّم خاص بدل القضاء (م.1006 ق.إ.م.إ)', category: 'طرق بديلة' },
  { ar: 'الخبرة القضائية', fr: 'Expertise judiciaire', def: 'تعيين خبير من قبل القاضي للاستعانة برأيه الفني في مسألة تتطلب خبرة خاصة', category: 'طرق بديلة' },
];

/* ─────────────────────── Helpers ─────────────────────── */

const ALL_CATEGORIES = Array.from(new Set(LEGAL_TERMS.map((t) => t.category)));

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي');
}

function fuzzyMatch(term: LegalTerm, query: string): boolean {
  const q = normalize(query);
  return (
    normalize(term.ar).includes(q) ||
    term.fr.toLowerCase().includes(q) ||
    normalize(term.def).includes(q)
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  'إجراءات': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  'تنفيذ': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  'عقود': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  'عقار': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  'التزامات': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  'جزائي': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  'طعون': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  'طرق بديلة': 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
}

/* ─────────────────────── Component ─────────────────────── */

export default function LegalDictionary({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filteredTerms = useMemo(() => {
    return LEGAL_TERMS.filter((term) => {
      const matchesSearch = search.trim() ? fuzzyMatch(term, search.trim()) : true;
      const matchesCategory = selectedCategory ? term.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  function toggleExpand(ar: string) {
    setExpanded((prev) => (prev === ar ? null : ar));
  }

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-[#1a3a5c] dark:text-[#f0c040] text-lg font-bold">→</button>
        <h2 className="text-lg font-bold text-[#1a3a5c] dark:text-[#f0c040]">📚 معجم المصطلحات القانونية</h2>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
        {LEGAL_TERMS.length} مصطلح قانوني بالعربية والفرنسية مع التعريف والمرجع القانوني
      </p>

      {/* Search bar */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="ابحث بالعربية أو الفرنسية أو التعريف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 pr-9 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`text-[11px] px-3 py-1 rounded-full border transition-all font-medium ${
            !selectedCategory
              ? 'bg-[#6366f1] text-white border-[#6366f1]'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#6366f1]/40'
          }`}
        >
          الكل ({LEGAL_TERMS.length})
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const count = LEGAL_TERMS.filter((t) => t.category === cat).length;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(isSelected ? null : cat)}
              className={`text-[11px] px-3 py-1 rounded-full border transition-all font-medium ${
                isSelected
                  ? 'bg-[#6366f1] text-white border-[#6366f1]'
                  : `${getCategoryColor(cat)} hover:opacity-80`
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {filteredTerms.length === LEGAL_TERMS.length
            ? `${LEGAL_TERMS.length} مصطلح`
            : `${filteredTerms.length} من ${LEGAL_TERMS.length} مصطلح`}
        </span>
        {(search || selectedCategory) && (
          <button
            onClick={() => { setSearch(''); setSelectedCategory(null); }}
            className="text-[11px] text-[#6366f1] dark:text-indigo-400 hover:underline"
          >
            مسح الفلتر
          </button>
        )}
      </div>

      {/* Terms list */}
      {filteredTerms.length > 0 ? (
        <div className="space-y-2">
          {filteredTerms.map((term) => {
            const isExpanded = expanded === term.ar;
            return (
              <div
                key={term.ar}
                className={`bg-white dark:bg-gray-800 rounded-xl border transition-all overflow-hidden ${
                  isExpanded
                    ? 'border-[#6366f1]/40 dark:border-indigo-700/50 shadow-sm shadow-indigo-100/50 dark:shadow-none'
                    : 'border-gray-200 dark:border-gray-700 hover:border-[#6366f1]/30 dark:hover:border-indigo-700/30'
                }`}
              >
                {/* Card header — always visible */}
                <button
                  onClick={() => toggleExpand(term.ar)}
                  className="w-full px-4 py-3 flex items-start justify-between gap-3 text-right"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#1a3a5c] dark:text-gray-100">{term.ar}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getCategoryColor(term.category)}`}>
                        {term.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6366f1] dark:text-indigo-400 mt-0.5 font-medium">
                      {term.fr}
                    </div>
                    {!isExpanded && (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-1">
                        {term.def}
                      </div>
                    )}
                  </div>
                  <span className={`text-gray-400 dark:text-gray-500 text-xs flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                      {term.def}
                    </p>

                    {/* Extract article references from definition */}
                    {(() => {
                      const articleMatch = term.def.match(/م\.\d+[^)،.]*/g);
                      const lawMatch = term.def.match(/\(([^)]+)\)/g);
                      if (articleMatch || lawMatch) {
                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {lawMatch?.map((ref, i) => (
                              <span
                                key={i}
                                className="text-[10px] bg-[#6366f1]/10 dark:bg-indigo-900/30 text-[#6366f1] dark:text-indigo-400 border border-[#6366f1]/20 dark:border-indigo-800 px-2 py-0.5 rounded-full"
                              >
                                📖 {ref.replace(/[()]/g, '')}
                              </span>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* French equivalent highlight */}
                    <div className="mt-3 bg-indigo-50 dark:bg-indigo-900/15 border border-indigo-100 dark:border-indigo-800 rounded-lg px-3 py-2">
                      <div className="text-[10px] text-indigo-400 dark:text-indigo-500 mb-0.5">المقابل الفرنسي</div>
                      <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{term.fr}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            لا توجد نتائج لـ "{search}"
            {selectedCategory && ` في تصنيف "${selectedCategory}"`}
          </p>
          <button
            onClick={() => { setSearch(''); setSelectedCategory(null); }}
            className="mt-2 text-xs text-[#6366f1] dark:text-indigo-400 hover:underline"
          >
            مسح البحث
          </button>
        </div>
      )}

      {/* Stats footer */}
      <div className="mt-5 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl p-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'إجمالي', value: LEGAL_TERMS.length },
            { label: 'تصنيفات', value: ALL_CATEGORIES.length },
            { label: 'موجود', value: filteredTerms.length },
            { label: 'مع مراجع', value: LEGAL_TERMS.filter((t) => /م\.\d+/.test(t.def)).length },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-base font-bold text-[#6366f1] dark:text-indigo-400">{stat.value}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
