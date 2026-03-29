#!/bin/bash

# سكريبت النشر السريع
echo "📦 جاري رفع التعديلات..."

# اطلب وصف التعديل
read -p "📝 وصف التعديل: " msg

# إذا لم يُدخل وصفاً → رسالة افتراضية
if [ -z "$msg" ]; then
  msg="🔧 تحديث عام $(date '+%Y-%m-%d %H:%M')"
fi

git add .
git commit -m "$msg"
git push origin main

echo ""
echo "✅ تم النشر بنجاح!"
echo "🔗 الرابط: https://hiyaat-dz.vercel.app"
echo "⏱️  انتظر 30-60 ثانية لتفعيل التحديث"
