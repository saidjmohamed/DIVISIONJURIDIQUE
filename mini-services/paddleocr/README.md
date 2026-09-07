# خدمة OCR العربية — DIVISIONJURIDIQUE

هذه الخدمة تشغّل **PaddleOCR 3.7.0** مع نموذج **PP-OCRv5 Arabic** لمعالجة ملفات PDF المصوّرة وتحويلها إلى نص عربي قابل للنسخ.

## لماذا PP-OCRv5 Arabic؟

النموذج العربي مخصص للتعرف على العربية والأرقام ويدعم الإنجليزية أيضاً. تم اختيار PP-OCRv5 Arabic بدلاً من PP-OCRv6 لأن PP-OCRv6 الحالي لا يوفّر نموذج تعرف عربي مدمجاً.

## التشغيل بواسطة Docker

```bash
docker build -t divisionjuridique-paddleocr ./mini-services/paddleocr

docker run --rm -p 8000:8000 \
  -e OCR_SERVICE_TOKEN=CHANGE_ME \
  divisionjuridique-paddleocr
```

ثم في تطبيق Next.js:

```env
OCR_SERVICE_URL=http://127.0.0.1:8000
OCR_SERVICE_TOKEN=CHANGE_ME
```

في بيئة الإنتاج، يجب وضع الخدمة خلف HTTPS وشبكة خاصة أو جدار ناري، وعدم ترك المنفذ 8000 مفتوحاً للعامة.

## اختبار الخدمة

```bash
curl http://127.0.0.1:8000/health
```

لـ OCR:

```bash
curl -X POST http://127.0.0.1:8000/ocr \
  -H "Authorization: Bearer CHANGE_ME" \
  -F "file=@document.pdf"
```

## ملاحظات قانونية

- OCR ليس بديلاً عن المراجعة البشرية.
- لا تعتمد على النص المستخرج وحده عند نقل رقم مادة أو مبلغ أو اسم أو تاريخ أو منطوق حكم.
- الخدمة تعيد درجة ثقة تقريبية لكل صفحة ولكل سطر عندما يوفرها النموذج.
- المعالجة الحالية تحفظ الملف مؤقتاً أثناء العملية ثم تحذفه بعد الانتهاء.
