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
│   │       │   └── route.ts            # نقطة نهاية المحادثة
│   │       ├── 📁 cron/
│   │       │   └── fetch-updates/      # جلب التحديثات القانونية
│   │       ├── 📁 debug-ai/            # تشخيص حالة AI (محمي)
│   │       ├── 📁 legal-search/        # البحث القانوني
│   │       ├── 📁 legal-updates/       # التحديثات القانونية
│   │       ├── 📁 petition-check/      # فحص العرائض
│   │       ├── 📁 quiz/
│   │       │   └── generate/           # توليد أسئلة الكويز
│   │       ├── 📁 redis-check/         # فحص Redis
│   │       ├── 📁 telegram-sync/       # مزامنة تيليجرام
│   │       └── 📁 tools/               # أدوات المحامي
│   │           ├── contract/           # مراجعة العقود
│   │           ├── judgment/           # تحليل الأحكام
│   │           └── memo/               # مسودة المذكرات
│   │
│   ├── 📁 components/                  # مكونات React
│   │   ├── 📁 ui/                      # مكونات shadcn/ui (38 مكون)
│   │   ├── 📁 deadlines/               # حاسبة الآجال القانونية
│   │   ├── 📁 jurisprudence/           # الاجتهاد القضائي
│   │   ├── 📁 lawyer-tools/            # أدوات المحامي (16 أداة)
│   │   ├── AiAssistant.tsx             # مساعد AI الرئيسي
│   │   ├── GlobalLawSearch.tsx         # بحث قانوني شامل
│   │   ├── LegalDeadlinesCalculator.tsx # حاسبة الآجال
│   │   ├── JudicialHierarchy.tsx       # التسلسل القضائي
│   │   ├── LegalUpdatesTab.tsx         # التحديثات القانونية
│   │   ├── ModernTabs.tsx              # نظام التبويبات
│   │   └── ...                         # مكونات أخرى
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
│       ├── ai-core.ts                  # محرك AI رباعي المستويات
│       ├── db.ts                       # اتصال Prisma
│       ├── rate-limit.ts               # تقييد الطلبات
│       ├── legal-search.ts             # بحث قانوني
│       ├── legal-cache.ts              # تخزين مؤقت
│       ├── legal-rules.ts              # قواعد قانونية
│       ├── deadline-calculator.ts      # حساب الآجال
│       ├── extract-text.ts             # استخراج النص
│       ├── cloud-storage.ts            # تخزين سحابي
│       ├── ilovepdf.ts                 # أدوات PDF
│       └── utils.ts                    # أدوات مساعدة عامة
│
├── 📁 public/                          # ملفات ثابتة
│   ├── 📁 laws-json/                   # قاعدة القوانين (270+ ملف JSON)
│   │   ├── index.json                  # فهرس القوانين
│   │   ├── all.json                    # جميع القوانين مجمعة
│   │   ├── civil.json                  # القانون المدني
│   │   ├── penal.json                  # قانون العقوبات
│   │   ├── qij.json                    # إجراءات جزائية
│   │   ├── qima.json                   # إجراءات مدنية
│   │   ├── commercial.json             # القانون التجاري
│   │   ├── family.json                 # قانون الأسرة
│   │   ├── fiscal.json                 # القانون المالي
│   │   ├── maritime.json               # القانون البحري
│   │   └── ...                         # 260+ قانون آخر
│   │
│   ├── 📁 jurisprudence/               # الاجتهاد القضائي
│   │   ├── index.json                  # فهرس الاجتهادات
│   │   ├── civil.json                  # اجتهادات مدنية
│   │   ├── penal.json                  # اجتهادات جزائية
│   │   ├── commercial.json             # اجتهادات تجارية
│   │   ├── family.json                 # اجتهادات أسرة
│   │   ├── social.json                 # اجتهادات اجتماعية
│   │   ├── realestate.json             # اجتهادات عقارية
│   │   ├── compensation.json           # اجتهادات تعويضات
│   │   ├── misdemeanor.json            # اجتهادات جنح
│   │   └── combined.json               # اجتهادات مجمعة
│   │
│   ├── 📁 laws/                        # نسخة ثانية من القوانين
│   ├── 📁 fonts/                       # خطوط عربية
│   │   └── NotoSansArabic-Regular.ttf
│   ├── 📁 icons/                       # أيقونات PWA (8 أحجام)
│   ├── logo.svg                        # شعار المنصة
│   ├── manifest.json                   # بيان PWA
│   ├── sw.js                           # Service Worker
│   ├── offline.html                    # صفحة عدم الاتصال
│   ├── robots.txt                      # تعليمات محركات البحث
│   ├── changelog.json                  # سجل التغييرات
│   └── developer.jpg                   # صورة المطور
│
├── 📁 scripts/                         # سكريبتات المعالجة
│   ├── count-articles.mjs              # عد المواد القانونية
│   ├── export-laws-json.mjs            # تصدير القوانين
│   ├── convert-laws.js                 # تحويل القوانين
│   ├── convert_laws_to_app.py          # تحويل للتنسيق التطبيقي
│   ├── process_laws.py                 # معالجة القوانين (v1)
│   ├── process_laws_v2.py              # معالجة القوانين (v2)
│   └── 📁 pdf-processor/              # معالجة ملفات PDF
│       ├── step1-extract-pdf.mjs
│       ├── step2-parse-ai.mjs
│       ├── step3-classify.mjs
│       └── step4-merge.mjs
│
├── 📁 mini-services/                   # خدمات مصغرة
│   └── .gitkeep
│
└── 📁 download/                        # بيانات محفوظة (gitignored)
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
