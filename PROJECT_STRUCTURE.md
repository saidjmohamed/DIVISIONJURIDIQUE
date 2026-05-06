# 📂 PROJECT_STRUCTURE — شجرة مشروع DIVISIONJURIDIQUE

<div dir="rtl">

هذا الملف يوثق الهيكل الكامل للمشروع لتسهيل الفهرسة والتحليل من قبل GitHub Search وأدوات الذكاء الاصطناعي.

</div>

---

## شجرة المشروع

```
DIVISIONJURIDIQUE/
│
├── 📄 README.md                        # التوثيق الرئيسي للمشروع
├── 📄 PROJECT_STRUCTURE.md             # هذا الملف — شجرة المشروع
├── 📄 ANALYSIS_REPORT.md               # تقرير التحليل والتعديلات
├── 📄 SECURITY_REPORT.md               # تقرير الأمان
├── 📄 IMPROVEMENTS.md                  # اقتراحات التحسين
├── 📄 .env.example                     # نموذج متغيرات البيئة
├── 📄 .gitignore                       # ملفات مستثناة من Git
├── 📄 LICENSE                          # ترخيص MIT
├── 📄 package.json                     # تبعيات Node.js
├── 📄 package-lock.json                # أقفال التبعيات
├── 📄 next.config.ts                   # إعدادات Next.js
├── 📄 tsconfig.json                    # إعدادات TypeScript
├── 📄 tailwind.config.ts               # إعدادات Tailwind CSS
├── 📄 postcss.config.mjs               # إعدادات PostCSS
├── 📄 eslint.config.mjs                # إعدادات ESLint
├── 📄 components.json                  # إعدادات shadcn/ui
├── 📄 vercel.json                      # إعدادات Vercel
├── 📄 Caddyfile                        # إعدادات خادم Caddy
├── 📄 CLAUDE.md                        # تعليمات Claude AI
├── 📄 DEPLOY_INSTRUCTIONS.md           # تعليمات النشر
├── 📄 deploy.sh                        # سكريبت النشر
│
├── 📁 .github/
│   └── workflows/
│       ├── auto-update.yml             # تحديث تلقائي عبر GitHub Actions
│       └── fix-actions.yml             # إصلاح أخطاء CI
│
├── 📁 prisma/
│   └── schema.prisma                   # مخطط قاعدة البيانات (SQLite)
│
├── 📁 src/                             # الكود المصدري الرئيسي
│   ├── 📁 app/                         # Next.js App Router
│   │   ├── page.tsx                    # الصفحة الرئيسية
│   │   ├── layout.tsx                  # التخطيط العام (RTL + عربي)
│   │   ├── error.tsx                   # صفحة الأخطاء
│   │   ├── loading.tsx                 # صفحة التحميل
│   │   ├── globals.css                 # أنماط CSS العامة
│   │   │
│   │   └── 📁 api/                     # واجهات برمجة التطبيقات
│   │       ├── 📁 ai/                  # مساعد الذكاء الاصطناعي
│   │       │   └── route.ts            # نقطة نهاية المحادثة (Rate Limited: 20/min)
│   │       ├── 📁 cron/
│   │       │   └── fetch-updates/      # جلب التحديثات القانونية (CRON_SECRET)
│   │       ├── 📁 debug-ai/            # تشخيص حالة AI (محمي بـ CRON_SECRET)
│   │       ├── 📁 legal-search/        # البحث القانوني (Rate Limited: 20/min)
│   │       ├── 📁 legal-updates/       # التحديثات القانونية
│   │       ├── 📁 petition-check/      # فحص العرائض (Rate Limited: 10/min)
│   │       ├── 📁 quiz/
│   │       │   └── generate/           # توليد أسئلة الكويز (Rate Limited: 10/min)
│   │       ├── 📁 redis-check/         # فحص Redis (محمي + Rate Limited)
│   │       ├── 📁 telegram-sync/       # مزامنة تيليجرام (CRON_SECRET)
│   │       └── 📁 tools/               # أدوات المحامي
│   │           ├── contract/           # مراجعة العقود (Rate Limited: 8/min)
│   │           ├── judgment/           # تحليل الأحكام (Rate Limited: 8/min)
│   │           └── memo/               # مسودة المذكرات (Rate Limited: 6/min)
│   │
│   ├── 📁 components/                  # مكونات React
│   │   ├── 📁 ui/                      # مكونات shadcn/ui (38 مكون)
│   │   ├── 📁 deadlines/               # حاسبة الآجال القانونية
│   │   │   ├── DualDeadlineView.tsx    # عرض مزدوج للآجال
│   │   │   ├── DeadlineCalculator.tsx  # حاسبة الآجال
│   │   │   └── DeadlinesTable.tsx      # جدول الآجال
│   │   ├── 📁 jurisprudence/           # الاجتهاد القضائي
│   │   │   └── JurisprudenceTab.tsx    # تبويب الاجتهادات
│   │   ├── 📁 lawyer-tools/            # أدوات المحامي (16 أداة)
│   │   │   ├── AiPromptsGuide.tsx      # دليل محفزات AI
│   │   │   ├── CompensationCalculator.tsx # حاسبة التعويضات
│   │   │   ├── ComplaintChecker.tsx    # فحص الشكاوى
│   │   │   ├── ContractReviewer.tsx    # مراجعة العقود
│   │   │   ├── DeadlineCalculatorTool.tsx # أداة حساب الآجال
│   │   │   ├── DeadlinesFullView.tsx   # عرض كامل الآجال
│   │   │   ├── FormChecklist.tsx       # قائمة التحقق من النماذج
│   │   │   ├── FormalPetitionChecker.tsx # فحص العرائض الرسمية
│   │   │   ├── JudgmentAnalyzer.tsx    # تحليل الأحكام
│   │   │   ├── LawyerToolsTab.tsx      # تبويب أدوات المحامي
│   │   │   ├── LegalDictionary.tsx     # القاموس القانوني
│   │   │   ├── LegalQuizGame.tsx       # كويز قانوني
│   │   │   ├── MemoDrafter.tsx         # مسودة المذكرات
│   │   │   ├── NanoBananaBuilder.tsx   # بانا بناء نانو
│   │   │   ├── PetitionChecker.tsx     # فحص العرائض
│   │   │   ├── PetitionTemplates.tsx   # قوالب العرائض
│   │   │   ├── ProceduresComparison.tsx # مقارنة الإجراءات
│   │   │   ├── SmartPetitionChecker.tsx # فحص ذكي للعرائض
│   │   │   └── SubjectMatterJurisdiction.tsx # الاختصاص النوعي
│   │   ├── AiAssistant.tsx             # مساعد AI الرئيسي
│   │   ├── DeveloperInfo.tsx           # معلومات المطور
│   │   ├── ElectronicLitigationTab.tsx # التقاضي الإلكتروني
│   │   ├── EstablishmentDeclaration.tsx # تصريح المؤسسة
│   │   ├── GlobalLawSearch.tsx         # بحث قانوني شامل
│   │   ├── InAppBrowserBanner.tsx      # بانر المتصفح الداخلي
│   │   ├── InstallPrompt.tsx           # مطالبة تثبيت PWA
│   │   ├── JudicialHierarchy.tsx       # التسلسل القضائي
│   │   ├── LegalDeadlinesCalculator.tsx # حاسبة الآجال
│   │   ├── LegalUpdatesTab.tsx         # التحديثات القانونية
│   │   ├── ModernTabs.tsx              # نظام التبويبات
│   │   ├── ShareBubble.tsx             # فقاعة المشاركة
│   │   ├── TabContent.tsx              # محتوى التبويب
│   │   ├── TabDescription.tsx          # وصف التبويب
│   │   └── WelcomeScreen.tsx           # شاشة الترحيب
│   │
│   ├── 📁 data/                        # بيانات ثابتة
│   │   ├── deadlines-qij.ts            # آجال الإجراءات الجزائية
│   │   ├── deadlines-qima.ts           # آجال الإجراءات المدنية
│   │   ├── deadlines-all.ts            # جميع الآجال
│   │   ├── jurisdictions-data.ts       # بيانات المحاكم
│   │   ├── quiz-qij-25-14.ts           # كويز إجراءات جزائية
│   │   ├── quiz.ts                     # كويز عام
│   │   ├── laws-stats.json             # إحصائيات القوانين
│   │   └── legal-rules.json            # قواعد قانونية
│   │
│   ├── 📁 hooks/                       # React Hooks مخصصة
│   │   ├── use-mobile.ts               # كشف الجوال
│   │   ├── use-toast.ts                # إشعارات
│   │   ├── useCopyToClipboard.ts       # نسخ للحافظة
│   │   ├── useFavorites.ts             # المفضلة
│   │   ├── useFileAnalysis.ts          # تحليل الملفات
│   │   └── useQuiz.ts                  # الكويز
│   │
│   └── 📁 lib/                         # مكتبات مساعدة
│       ├── ai-core.ts                  # محرك AI رباعي المستويات + Rate Limiting
│       ├── legal-utils.ts              # أدوات قانونية مشتركة (تصنيف، استخراج، تنظيف)
│       ├── db.ts                       # اتصال Prisma
│       ├── rate-limit.ts               # تقييد الطلبات (Upstash Redis)
│       ├── legal-search.ts             # بحث قانوني
│       ├── legal-cache.ts              # تخزين مؤقت قانوني
│       ├── legal-rules.ts              # قواعد قانونية
│       ├── deadline-calculator.ts      # حساب الآجال
│       ├── extract-text.ts             # استخراج النص
│       ├── cloud-storage.ts            # تخزين سحابي (Redis + Telegram)
│       ├── ilovepdf.ts                 # أدوات PDF
│       └── utils.ts                    # أدوات مساعدة عامة (cn, etc.)
│
├── 📁 public/                          # ملفات ثابتة
│   ├── 📁 laws/                        # قاعدة القوانين (100+ ملف JSON)
│   ├── 📁 laws-json/                   # قوانين إضافية (270+ ملف JSON)
│   ├── 📁 jurisprudence/               # بيانات الاجتهاد القضائي (10 ملفات)
│   ├── 📁 fonts/                       # خطوط عربية (NotoSansArabic)
│   ├── 📁 icons/                       # أيقونات PWA (8 أحجام)
│   ├── logo.svg                        # شعار المنصة
│   ├── manifest.json                   # بيان PWA
│   ├── sw.js                           # Service Worker
│   ├── offline.html                    # صفحة عدم الاتصال
│   ├── robots.txt                      # تعليمات محركات البحث
│   ├── changelog.json                  # سجل التغييرات
│   └── developer.jpg                   # صورة المطور
│
├── 📁 scripts/                         # سكريبتات معالجة البيانات
│   ├── count-articles.mjs              # عد المواد القانونية
│   ├── export-laws-json.mjs            # تصدير القوانين
│   ├── convert-laws.js                 # تحويل القوانين (Node.js)
│   ├── convert_laws_to_app.py          # تحويل للتنسيق التطبيقي (Python)
│   ├── process_laws.py                 # معالجة القوانين v1 (Python)
│   ├── process_laws_v2.py              # معالجة القوانين v2 (Python)
│   └── 📁 pdf-processor/              # معالجة ملفات PDF
│       ├── package.json                # تبعيات المعالج
│       ├── step1-extract-pdf.mjs       # خطوة 1: استخراج النص من PDF
│       ├── step2-parse-ai.mjs          # خطوة 2: تحليل بالذكاء الاصطناعي
│       ├── step3-classify.mjs          # خطوة 3: تصنيف القوانين
│       └── step4-merge.mjs             # خطوة 4: دمج النتائج
│
├── 📁 mini-services/                   # خدمات مصغرة
│   └── .gitkeep
│
└── 📁 data/                            # بيانات محفوظة (gitignored)
    └── README.md
```

---

## الإحصائيات

| المقياس | القيمة |
|---------|--------|
| عدد ملفات TypeScript/TSX | ~110 ملف |
| عدد مكونات React | ~55 مكون |
| عدد واجهات API | 12 نقطة نهاية |
| عدد ملفات القوانين JSON | 270+ ملف |
| عدد ملفات الاجتهاد القضائي | 10 ملفات |
| عدد أدوات المحامي | 16 أداة |
| عدد مكونات shadcn/ui | 38 مكون |
| عدد React Hooks | 6 hooks |
| عدد مكتبات lib | 12 مكتبة |
| عدد سكريبتات المعالجة | 8 سكريبتات |
