---
Task ID: 1
Agent: Main Agent
Task: تصحيح الاختصاص الإقليمي للمحاكم الإدارية الابتدائية والاستئنافية في مشروع hiyaat-dz

Work Log:
- استنساخ مستودع DIVISIONJURIDIQUE من GitHub
- مراجعة ملف src/data/jurisdictions-data.ts وبيانات adminCourtsData
- البحث في الموقع الرسمي لمجلس الدولة (conseildetat.dz) للتحقق من قائمة المحاكم الإدارية
- البحث عن المرسوم التنفيذي 22-435 المتعلق بدوائر الاختصاص الإقليمي
- اكتشاف أن 10 ولايات جديدة (2019) ليس لها محاكم إدارية خاصة بها
- تصحيح بيانات الاختصاص الإقليمي للولايات العشر الجديدة
- رفع التعديلات إلى GitHub (commit dad6e9b)
- محاولة النشر عبر Vercel - رمز المصادقة منتهي الصلاحية

Stage Summary:
- تم تصحيح 10 ولايات جديدة في ملف adminCourtsData:
  1. المغير ← المحكمة الإدارية بورقلة (ورقلة استئنافية)
  2. المنيعة ← المحكمة الإدارية بغرداية (ورقلة استئنافية)
  3. عين صالح ← المحكمة الإدارية بإيليزي (ورقلة استئنافية - كان خطأ: تامنغست)
  4. عين قزام ← المحكمة الإدارية بإيليزي (ورقلة استئنافية - كان خطأ: تامنغست)
  5. توقرت ← المحكمة الإدارية ببسكرة (ورقلة استئنافية)
  6. جانت ← المحكمة الإدارية بورقلة (ورقلة استئنافية)
  7. أولاد جلال ← المحكمة الإدارية بالأغواط (ورقلة استئنافية)
  8. بني عباس ← المحكمة الإدارية ببشار (بشار استئنافية)
  9. برج باجي مختار ← المحكمة الإدارية ببشار (بشار استئنافية)
  10. تيميمون ← المحكمة الإدارية بغرداية (ورقلة استئنافية - كان خطأ: بشار)
- تم رفع التعديلات إلى GitHub بنجاح
- يحتاج رمز Vercel جديد لإتمام النشر

---
Task ID: 2
Agent: Main Agent
Task: إصلاح خطأ JSON parsing وإضافة OPENROUTER_API_KEY إلى Vercel

Work Log:
- فحص مستودع DIVISIONJURIDIQUE الموجود مسبقاً
- تحليل خطأ "Unexpected token '<', <!DOCTYPE" — سببه محاولة تحليل HTML كـ JSON
- اكتشاف تغييرات غير مرحّلة كانت تحضّر مسبقاً لإصلاح المشكلة
- التغييرات تشمل:
  1. AiAssistant.tsx: فحص res.ok قبل res.json() + try/catch للتحليل
  2. JurisprudenceTab.tsx: فحص حالة الاستجابة قبل تحليل JSON
  3. SmartPetitionChecker.tsx: حذف استيراد غير مستخدم
  4. extract-text.ts: تحسين معالجة أخطاء PDF/DOCX
- ضبط git config لاستخدام saidjmohamed / saidj.mohamed@gmail.com
- تنفيذ git commit بالتغييرات مع المؤلف الصحيح
- تنفيذ git pull --rebase لدمج التغييرات البعيدة
- تنفيذ git push بنجاح — Commit 9508484
- محاولة إضافة OPENROUTER_API_KEY إلى Vercel — فشلت بسبب عدم وجود رمز مصادقة Vercel

Stage Summary:
- تم إصلاح خطأ JSON parsing بنجاح — الكود الآن يفحص res.ok قبل تحليل JSON
- تم رفع الكود إلى GitHub بنجاح (commit 9508484)
- النشر على Vercel سيتم تلقائياً عبر Git integration
- يحتاج المستخدم لإضافة OPENROUTER_API_KEY يدوياً في لوحة تحكم Vercel
- رمز Vercel Token مطلوب للإضافة البرمجية

---
## Task ID: 3 - Main Agent
### Work Task
إعادة أداة التحقق الشكلي بالذكاء الاصطناعي إلى مشروع DIVISIONJURIDIQUE — إنشاء API route `/api/petition-check` وتعديل المكون `SmartPetitionChecker.tsx` لدعم AI مع fallback محلي.

### Work Summary
1. **إنشاء `/api/petition-check/route.ts`**:
   - API route جديد يستخدم OpenRouter مع سلسلة fallback من 10 نماذج مجانية
   - يستقبل `text` (نص المستند) و `petitionType` (نوع الوثيقة: opening, appeal, complaint_regular, complaint_civil, complaint_direct)
   - يرسل نص المستند لنماذج AI مع prompt قانوني مفصل يتضمن المواد القانونية الجزائرية (ق.إ.م.إ وق.إ.ج)
   - يُرجع JSON مهيكّل: result, score, checks[], summary, recommendations[]
   - يدعم JSON parsing مرن (حتى لو كان داخل markdown code blocks)
   - timeout لكل نموذج: 45 ثانية

2. **تعديل `SmartPetitionChecker.tsx`**:
   - إضافة state `aiPowered` لتتبع نوع التحليل المستخدم
   - دالة `analyze()` تُرسل الطلب إلى `/api/petition-check` أولاً
   - إذا فشل API (خطأ شبكة، JSON غير صالح، API key مفقود)، يُستخدم التحليل المحلي بالكلمات المفتاحية كبديل تلقائي
   - تحديث واجهة المستخدم: banner يوضح استخدام AI، badge يعرض نوع التحليل (AI vs محلي)
   - تحديث disclaimer ليعكس طريقة التحليل المستخدمة
   - تحديث خطوات التقدم لعرض "إرسال النص لنموذج الذكاء الاصطناعي" و "تحليل الشروط الشكلية بالذكاء الاصطناعي"

3. **التحقق والنشر**:
   - Lint: لا توجد أخطاء في الملفات المعدّلة (الأخطاء الموجودة في original/ directory فقط)
   - Git commit: `4a1e600` — "feat: إعادة أداة التحقق الشكلي بالذكاء الاصطناعي — تستخدم OpenRouter مع Fallback محلي"
   - Git push: تم الدفع بنجاح إلى `origin/master`

4. **المتطلبات المتبقية**:
   - يجب التأكد من أن `OPENROUTER_API_KEY` مُعدّ كمتغير بيئة على Vercel
   - API route يعمل فقط إذا كان OPENROUTER_API_KEY متوفراً
   - إذا لم يكن المتغير متوفراً، يُرجع API خطأ 500 مع `fallback: true` والمكون ينتقل تلقائياً للتحليل المحلي
