<div dir="rtl" align="center">

# ⚖️ الشامل القانوني — DIVISIONJURIDIQUE

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-A855F7?logo=pwa)](https://web.dev/progressive-web-apps/)

**منصة رقمية متكاملة لتسهيل العمل اليومي للمحامين والمكاتب القانونية الجزائرية**

أدوات ذكاء اصطناعي متقدمة • قاعدة بيانات قانونية شاملة تغطي أكثر من 100 قانون جزائري • حاسبات قانونية تفاعلية

[🚀 التشغيل](#-التشغيل) • [🌟 المميزات](#-المميزات-الرئيسية) • [📂 الهيكلة](#-هيكلة-المشروع) • [🔧 التقنيات](#-التقنيات-المستعملة) • [🔒 الأمان](#-الأمان)

</div>

---

## 🌟 المميزات الرئيسية

| الميزة | الوصف |
|--------|-------|
| 🤖 مساعد ذكاء اصطناعي | محرك AI رباعي المستويات (OpenRouter → Gemini 2.5 → Gemini 2.0 → Groq) مع انتقال تلقائي عند الفشل |
| 📚 قاعدة قوانين شاملة | أكثر من 100 قانون جزائري بالكامل (مدني، جزائي، تجاري، أسرة، إداري، إلخ) |
| 🔍 بحث قانوني ذكي | بحث في نصوص القوانين مع دعم اللغة العربية والتحقق من الآجال |
| ⚖️ حاسبة الآجال القانونية | حساب الآجال وفق القوانين الجزائرية (إجراءات جزائية + مدنية) |
| 📋 فحص العرائض | فحص تلقائي لصحة العرائض والطلبات القانونية (عادي + رسمي) |
| 📝 مسودة المذكرات | إنشاء مذكرات قانونية بمساعدة الذكاء الاصطناعي |
| 📄 مراجعة العقود | تحليل ومراجعة العقود قانونياً |
| 🏛️ تحليل الأحكام | تحليل الأحكام القضائية واستخراج النقاط القانونية |
| 🧮 حاسبة التعويضات | حساب التعويضات وفق المعايير القانونية |
| 🎯 كويز قانوني | أسئلة كويز تفاعلية لتقييم المعرفة القانونية |
| 📊 اجتهاد قضائي | قاعدة بيانات الاجتهاد القضائي الجزائري (مدني، جزائي، تجاري، أسرة، إلخ) |
| 📰 تحديثات قانونية | متابعة يومية تلقائية من الجريدة الرسمية ومجلس الدولة ووزارة العدل ووكالة الأنباء |
| 🏛️ التسلسل القضائي | تحديد الاختصاص الإقليمي لكل بلديات الوطن |
| 💻 التقاضي الإلكتروني | منصات التقاضي وضغط ملفات PDF |
| 📱 PWA | تثبيت كتطبيق على الهاتف بدون متصفح |

---

## 🛠️ التقنيات المستعملة

### الواجهة الأمامية (Frontend)
- **Next.js 16** — إطار عمل React متكامل مع SSR/SSG و App Router
- **React 19** — مكتبة واجهة المستخدم مع Hooks و Server Components
- **TypeScript 5** — كتابة كود آمن وقابل للصيانة
- **Tailwind CSS 4** — تنسيق سريع وعصري مع تصميم متجاوب
- **shadcn/ui** — مكونات واجهة احترافية (38 مكون Radix UI)
- **Framer Motion** — حركات وانتقالات سلسة
- **Recharts** — رسوم بيانية تفاعلية

### الخلفية (Backend)
- **Next.js API Routes** — 12 نقطة نهاية REST API
- **Prisma ORM** — إدارة قاعدة البيانات (SQLite)
- **Upstash Redis** — تخزين مؤقت وتقييد الطلبات
- **AI Fallback System** — نظام ذكاء اصطناعي متعدد المستويات

### مزودو الذكاء الاصطناعي
1. **OpenRouter** — نماذج مجانية (GPT-OSS 120B, MiniMax M2.5, Nemotron 3)
2. **Google Gemini 2.5 Flash** — نموذج سريع ومدفوع
3. **Google Gemini 2.0 Flash** — نموذج مجاني (4 مفاتيح بالتناوب)
4. **Groq** — Llama 3.3 70B (سريع جداً، مجاني)

### النشر والاستضافة
- **Vercel** — استضافة سحابية
- **Caddy** — خادم ويب بديل
- **PWA** — دعم التطبيق التدريجي مع Service Worker
- **GitHub Actions** — CI/CD تلقائي

---

## 🚀 التشغيل

### المتطلبات
- Node.js 18+ أو Bun
- npm أو bun أو pnpm

### التثبيت

```bash
# استنساخ المستودع
git clone https://github.com/saidjmohamed/DIVISIONJURIDIQUE.git
cd DIVISIONJURIDIQUE

# تثبيت التبعيات
npm install

# إعداد متغيرات البيئة
cp .env.example .env.local
# عدّل .env.local وأضف مفاتيح API الخاصة بك

# إعداد قاعدة البيانات
npx prisma db push

# تشغيل الخادم المحلي
npm run dev
```

### البناء للإنتاج

```bash
npm run build
npm start
```

### سكريبتات متاحة

| السكريبت | الوصف |
|----------|-------|
| `npm run dev` | تشغيل خادم التطوير |
| `npm run build` | بناء للإنتاج |
| `npm start` | تشغيل نسخة الإنتاج |
| `npm run lint` | فحص الكود |
| `npm run count` | عد المواد القانونية |
| `npm run db:push` | تحديث مخطط قاعدة البيانات |

---

## 📂 هيكلة المشروع

```
DIVISIONJURIDIQUE/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # الصفحة الرئيسية
│   │   ├── layout.tsx              # التخطيط العام (RTL + عربي)
│   │   ├── error.tsx               # صفحة الأخطاء
│   │   ├── loading.tsx             # صفحة التحميل
│   │   ├── globals.css             # أنماط CSS العامة
│   │   └── api/                    # واجهات برمجة التطبيقات (12 نقطة)
│   │       ├── ai/                 # مساعد الذكاء الاصطناعي
│   │       ├── legal-search/       # البحث القانوني
│   │       ├── legal-updates/      # التحديثات القانونية
│   │       ├── petition-check/     # فحص العرائض
│   │       ├── quiz/generate/      # الكويز القانوني
│   │       ├── tools/              # أدوات المحامي (عقود، مذكرات، أحكام)
│   │       ├── cron/fetch-updates/ # مهام مجدولة
│   │       ├── debug-ai/           # تشخيص حالة AI (محمي)
│   │       ├── telegram-sync/      # مزامنة تيليجرام
│   │       └── redis-check/        # فحص Redis
│   ├── components/
│   │   ├── ui/                     # مكونات shadcn/ui (38 مكون)
│   │   ├── deadlines/              # حاسبة الآجال القانونية
│   │   ├── jurisprudence/          # الاجتهاد القضائي
│   │   ├── lawyer-tools/           # أدوات المحامي (16 أداة)
│   │   ├── AiAssistant.tsx         # مساعد AI الرئيسي
│   │   ├── GlobalLawSearch.tsx     # بحث قانوني شامل
│   │   └── ...                     # مكونات أخرى
│   ├── data/                       # بيانات ثابتة (آجال، كويز، إحصائيات)
│   ├── hooks/                      # React Hooks مخصصة (6 hooks)
│   └── lib/                        # مكتبات مساعدة
│       ├── ai-core.ts              # محرك AI رباعي المستويات
│       ├── legal-utils.ts          # أدوات قانونية مشتركة
│       ├── legal-search.ts         # بحث قانوني
│       ├── legal-cache.ts          # تخزين مؤقت
│       ├── legal-rules.ts          # قواعد قانونية
│       ├── deadline-calculator.ts  # حساب الآجال
│       ├── rate-limit.ts           # تقييد الطلبات
│       ├── db.ts                   # اتصال Prisma
│       ├── cloud-storage.ts        # تخزين سحابي
│       ├── extract-text.ts         # استخراج النص
│       ├── ilovepdf.ts             # أدوات PDF
│       └── utils.ts                # أدوات مساعدة عامة
├── public/
│   ├── laws/                       # قاعدة بيانات القوانين (100+ ملف JSON)
│   ├── jurisprudence/              # بيانات الاجتهاد القضائي
│   ├── fonts/                      # خطوط عربية
│   ├── icons/                      # أيقونات PWA
│   ├── manifest.json               # بيان PWA
│   └── sw.js                       # Service Worker
├── prisma/
│   └── schema.prisma               # مخطط قاعدة البيانات (SQLite)
├── scripts/
│   ├── count-articles.mjs          # عد المواد القانونية
│   ├── export-laws-json.mjs        # تصدير القوانين
│   ├── convert-laws.js             # تحويل القوانين
│   ├── convert_laws_to_app.py      # تحويل للتنسيق التطبيقي
│   └── pdf-processor/              # معالجة ملفات PDF (4 خطوات)
├── .github/workflows/              # CI/CD مع GitHub Actions
├── .env.example                    # نموذج متغيرات البيئة
├── PROJECT_STRUCTURE.md            # شجرة المشروع الكاملة
├── ANALYSIS_REPORT.md              # تقرير التحليل والتعديلات
├── SECURITY_REPORT.md              # تقرير الأمان
├── IMPROVEMENTS.md                 # اقتراحات التحسين
├── LICENSE                         # ترخيص MIT
└── README.md                       # هذا الملف
```

---

## 🔒 الأمان

- جميع مفاتيح API تُدار عبر متغيرات البيئة (`.env.local`)
- تقييد الطلبات (Rate Limiting) على جميع نقاط API
- مصادقة CRON_SECRET لحماية نقاط التشخيص والمزامنة الداخلية
- ملف `.gitignore` شامل لمنع رفع البيانات الحساسة
- لا يتم عرض أي جزء من مفاتيح API في نقاط التشخيص
- نقطة `/api/redis-check` محمية بمصادقة في الإنتاج

> ⚠️ **تحذير**: لا ترفع ملفات `.env` أو مفاتيح API إلى المستودع أبداً. راجع [SECURITY_REPORT.md](SECURITY_REPORT.md) للتفاصيل.

---

## 👨‍⚖️ المطور

**الأستاذ سايج محمد**
محامٍ لدى مجلس قضاء الجزائر

📍 الجزائر

---

## 📄 الترخيص

هذا المشروع مرخص بموجب [MIT License](LICENSE).

---

<div dir="rtl" align="center">

**صدقة جارية لروح الوالد سايج عبد النور رحمه الله** 🤲

</div>
