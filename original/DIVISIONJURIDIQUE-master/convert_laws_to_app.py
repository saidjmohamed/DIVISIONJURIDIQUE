#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
تحويل القوانين المعالجة إلى تنسيق تطبيق الشامل
"""

import json
import os
import re
from typing import Dict, Any

# أيقونات حسب التصنيف
CATEGORY_ICONS = {
    "مدني": "⚖️",
    "أسرة": "👨‍👩‍👧",
    "تجاري": "🏢",
    "جزائي": "🔒",
    "إداري": "🏛️",
    "دستوري": "📜",
    "عمل": "👷",
    "مالي": "💰",
    "بيئة": "🌿",
    "صحة": "🏥",
    "إعلام": "📺",
    "أمن": "🚨",
    "طاقة": "⚡",
    "عقاري": "🏠",
    "بحري": "⚓",
    "اجتماعي": "🤝",
    "نقل": "🚛",
    "سياحي": "🏖️",
    "أخرى": "📋",
}

# ألوان حسب التصنيف
CATEGORY_COLORS = {
    "مدني": "#2563eb",
    "أسرة": "#ec4899",
    "تجاري": "#8b5cf6",
    "جزائي": "#dc2626",
    "إداري": "#ea580c",
    "دستوري": "#1e3a5f",
    "عمل": "#f59e0b",
    "مالي": "#16a34a",
    "بيئة": "#059669",
    "صحة": "#06b6d4",
    "إعلام": "#6366f1",
    "أمن": "#ef4444",
    "طاقة": "#eab308",
    "عقاري": "#78716c",
    "بحري": "#0ea5e9",
    "اجتماعي": "#f97316",
    "نقل": "#3b82f6",
    "سياحي": "#14b8a6",
    "أخرى": "#6b7280",
}

def sanitize_filename(name: str) -> str:
    """تحويل اسم القانون إلى اسم ملف صالح"""
    # إزالة الرموز غير المسموحة
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    # تحويل المسافات إلى شرطات سفلية
    name = name.replace(' ', '_')
    # إزالة الشرطات المتكررة
    name = re.sub(r'_+', '_', name)
    return name.strip('_')

def convert_law_to_app_format(law: Dict[str, Any], index: int) -> tuple:
    """تحويل قانون واحد إلى تنسيق التطبيق"""
    
    # تحديد الأيقونة واللون
    category = law.get('category', 'أخرى')
    icon = CATEGORY_ICONS.get(category, '📋')
    color = CATEGORY_COLORS.get(category, '#6b7280')
    
    # اسم الملف
    filename = f"قانون_{index+1}_{sanitize_filename(law['title'][:30])}.json"
    
    # تحويل المواد
    articles = []
    for article in law.get('articles', []):
        articles.append({
            "number": article.get('article', '').replace('المادة ', '').strip(),
            "text": article.get('text', ''),
            "book": "",
            "chapter": "",
            "isAmended": False,
            "isNew": False
        })
    
    # تنسيق القانون للتطبيق
    app_law = {
        "title": law.get('title', ''),
        "officialName": law.get('title', ''),
        "number": law.get('number', ''),
        "date": law.get('date', ''),
        "journalNumber": law.get('official_journal', ''),
        "totalArticles": len(articles),
        "category": category,
        "lawType": law.get('law_type', 'قانون'),
        "keywords": law.get('keywords', []),
        "developerCredit": law.get('developer_credit', ''),
        "articles": articles
    }
    
    # معلومات الفهرس
    index_entry = {
        "file": filename,
        "name": law.get('title', ''),
        "icon": icon,
        "color": color,
        "number": law.get('number', ''),
        "date": law.get('date', ''),
        "journalNumber": law.get('official_journal', ''),
        "articles": len(articles),
        "category": category,
        "firstArticle": articles[0]['text'][:150] if articles else '',
        "description": f"{law.get('law_type', 'قانون')} - {category}"
    }
    
    return filename, app_law, index_entry

def main():
    print("=" * 70)
    print("تحويل القوانين المعالجة إلى تنسيق تطبيق الشامل")
    print("=" * 70)
    
    # قراءة القوانين المعالجة
    input_file = '/home/z/my-project/download/processed_laws.json'
    output_dir = '/home/z/my-project/public/laws'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        processed_laws = json.load(f)
    
    print(f"\n📂 عدد القوانين للتحويل: {len(processed_laws)}")
    
    # إنشاء مجلد الإخراج إذا لم يكن موجوداً
    os.makedirs(output_dir, exist_ok=True)
    
    # تحويل كل قانون
    index_data = []
    
    for i, law in enumerate(processed_laws):
        try:
            filename, app_law, index_entry = convert_law_to_app_format(law, i)
            
            # حفظ ملف القانون
            output_path = os.path.join(output_dir, filename)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(app_law, f, ensure_ascii=False, indent=2)
            
            index_data.append(index_entry)
            
            print(f"✅ {i+1}. {law['title'][:50]}... ({len(app_law['articles'])} مادة)")
            
        except Exception as e:
            print(f"❌ {i+1}. خطأ في تحويل: {law.get('title', 'غير معروف')}: {e}")
    
    # حفظ الفهرس الجديد (دمج مع الفهرس القديم)
    index_path = os.path.join(output_dir, 'index.json')
    
    # قراءة الفهرس القديم
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            old_index = json.load(f)
        print(f"\n📚 الفهرس القديم: {len(old_index)} قانون")
    except:
        old_index = []
    
    # دمج الفهارس (القديمة أولاً ثم الجديدة)
    combined_index = old_index + index_data
    
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(combined_index, f, ensure_ascii=False, indent=2)
    
    print(f"\n📚 الفهرس المحدث: {len(combined_index)} قانون")
    print(f"   - قوانين قديمة: {len(old_index)}")
    print(f"   - قوانين جديدة: {len(index_data)}")
    
    # إحصائيات
    total_articles = sum(law['articles'] for law in combined_index)
    
    print("\n" + "=" * 70)
    print("📊 الإحصائيات النهائية:")
    print(f"   • إجمالي القوانين: {len(combined_index)}")
    print(f"   • إجمالي المواد: {total_articles:,}")
    print("=" * 70)
    
    # توزيع التصنيفات
    categories = {}
    for law in combined_index:
        cat = law.get('category', 'أخرى')
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\n📁 توزيع التصنيفات:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"   • {cat}: {count}")
    
    print(f"\n✅ تم حفظ الملفات في: {output_dir}")

if __name__ == "__main__":
    main()
