#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سكريبت معالجة القوانين الجزائرية
- تنظيف البيانات
- استخراج المواد
- منع التكرار
- إخراج JSON منظم
"""

import json
import re
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from datetime import datetime

# القوانين الموجودة حالياً في التطبيق (يتم استبعادها)
EXISTING_LAWS = {
    # الاسم أو الرقم
    "القانون المدني": "75-58",
    "قانون الأسرة": "84-11",
    "القانون التجاري": "75-59",
    "القانون البحري": "88-03",
    "قانون الإجراءات الجزائية": "14-02",
    "قانون الإجراءات الجبائية": "06-08",
    "قانون الإجراءات المدنية والإدارية": "08-09",
    "قانون العقوبات": "66-156",
    "قانون الجنسية": "70-86",
    "قانون المرور": "09-01",
    "قانون المنافسة": "03-03",
    "قانون تنصيب العمال": "04-19",
    "قانون تسوية النزاعات الفردية": "90-04",
    "قانون النشاط السمعي البصري": "14-05",
    "قانون الوقاية من الاتجار بالبشر": "09-01",
    "قانون الوقاية من عصابات الأحياء": "14-06",
}

# كلمات مفتاحية للقوانين الموجودة
EXISTING_KEYWORDS = [
    "قانون المدني",
    "القانون المدني",
    "قانون الأسرة",
    "قانون الأسرة",
    "القانون التجاري",
    "قانون البحري",
    "القانون البحري",
    "الإجراءات الجزائية",
    "الإجراءات الجبائية",
    "الإجراءات المدنية والإدارية",
    "قانون العقوبات",
    "قانون الجنسية",
    "قانون المرور",
    "قانون المنافسة",
    "تنصيب العمال",
    "تسوية النزاعات الفردية",
    "النشاط السمعي البصري",
    "الاتجار بالبشر",
    "عصابات الأحياء",
]

# أرقام القوانين الموجودة
EXISTING_NUMBERS = [
    "75-58", "75-59", "84-11", "88-03", "14-02", "06-08", 
    "08-09", "66-156", "70-86", "09-01", "03-03", "04-19",
    "90-04", "14-05", "14-06"
]

# تصنيفات القوانين
LAW_CATEGORIES = {
    "مدني": ["مدني", "الأحوال الشخصية", "الحالة المدنية", "اللقب", "النفقة"],
    "أسرة": ["أسرة", "زواج", "طلاق", "ميراث", "النفقة"],
    "تجاري": ["تجاري", "تجارة", "شركات", "بورصة", "منافسة", "استثمار"],
    "جزائي": ["عقوبات", "جزائي", "جريمة", "عقوبة", "سجون", "اعتداء"],
    "إداري": ["إداري", "وظيفة عمومية", "بلدية", "ولاية", "جماعات محلية"],
    "دستوري": ["دستور", "الجنسية", "انتخابات"],
    "عمل": ["عمل", "تشغيل", "أجراء", "نزاعات العمل", "ضمان اجتماعي", "تقاعد"],
    "مالي": ["ضرائب", "جبائية", "رسوم", "جمارك", "مالية"],
    "بيئة": ["بيئة", "غابات", "شواطئ", "ساحل", "نفايات", "فلاحي"],
    "صحة": ["صحة", "طبي", "بيطري", "صيدلة"],
    "إعلام": ["إعلام", "سمعي بصري", "اتصالات"],
    "أمن": ["أمن", "دفاع", "عسكري", "أسلحة", "مرور"],
    "طاقة": ["كهرباء", "غاز", "محروقات", "مناجم"],
    "عقاري": ["عقاري", "سجل عقاري", "أملاك", "نزع ملكية", "تعمير"],
    "بحري": ["بحري", "ملاحة", "موانئ"],
    "اجتماعي": ["اجتماعي", "طفولة", "مسنين", "إعاقة", "تكفل"],
}


@dataclass
class Article:
    article: str
    text: str


@dataclass
class ProcessedLaw:
    title: str
    number: str
    date: str
    category: str
    articles: List[Article]
    source_url: str
    total_articles: int
    developer_credit: str


def clean_text(text: str) -> str:
    """تنظيف النص من العناصر غير المرغوبة"""
    # حذف نص المصدر
    patterns_to_remove = [
        r'تصميم و إخراج الأستاذ بوطاس الحاسن.*?ماي 2025',
        r'تصميم و إخراج الأستاذ بوطاس الحاسن.*?افريل 2026',
        r'الرجوع للصفحة الرئيسية',
        r'آخر تنسيق.*?\d{4}',
        r'اخر تنسيق.*?\d{4}',
        r'⬆️',
        r'⬇️',
    ]
    
    for pattern in patterns_to_remove:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    # تنظيف الفراغات الزائدة
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    
    return text.strip()


def extract_title(content: str) -> str:
    """استخراج عنوان القانون"""
    lines = content.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if 'تصميم و إخراج' in line:
            continue
        if 'الرجوع للصفحة' in line:
            continue
        if 'اخر تنسيق' in line or 'آخر تنسيق' in line:
            continue
        if line.startswith('⬆') or line.startswith('⬇'):
            continue
        if len(line) > 5:  # تجاهل الأسطر القصيرة جداً
            return line
    return "غير محدد"


def extract_number(title: str, content: str) -> str:
    """استخراج رقم القانون"""
    # البحث في العنوان أولاً
    patterns = [
        r'رقم\s*(\d{2,4}[-/]\d{2,4})',
        r'(\d{2,4}[-/]\d{2,4})',
        r'رقم\s*(\d+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, title)
        if match:
            return match.group(1)
    
    # البحث في المحتوى
    for pattern in patterns:
        match = re.search(pattern, content[:1000])
        if match:
            return match.group(1)
    
    # البحث عن "أمر رقم" أو "مرسوم رقم"
    patterns2 = [
        r'أمر\s*(?:رقم)?\s*(\d{2,4}[-/]\d{2,4})',
        r'مرسوم\s*(?:رقم)?\s*(\d{2,4}[-/]\d{2,4})',
        r'قانون\s*(?:رقم)?\s*(\d{2,4}[-/]\d{2,4})',
    ]
    
    for pattern in patterns2:
        match = re.search(pattern, content[:2000])
        if match:
            return match.group(1)
    
    return ""


def extract_date(content: str) -> str:
    """استخراج تاريخ الإصدار"""
    patterns = [
        # هجري وميلادي
        r'(\d{1,2}\s+(?:محرم|صفر|ربيع الأول|ربيع الثاني|جمادى الأولى|جمادى الثانية|رجب|شعبان|رمضان|شوال|ذو القعدة|ذو الحجة)\s+عام\s+\d{4})\s*الموافق\s*(\d{1,2}\s+(?:يناير|فبراير|مارس|أبريل|ماي|يونيو|يوليو|غشت|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s+سنة\s+\d{4})',
        # ميلادي فقط
        r'(\d{1,2}\s+(?:يناير|فبراير|مارس|أبريل|ماي|يونيو|يوليو|غشت|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s+سنة?\s*\d{4})',
        # سنة فقط
        r'سنة\s+(\d{4})',
        # تاريخ بين قوسين
        r'\(ج\s*ر\s*\d+[-–]\s*(\d{4})\)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content[:2000])
        if match:
            if len(match.groups()) > 1 and match.group(2):
                return f"{match.group(1)} الموافق {match.group(2)}"
            return match.group(1)
    
    return ""


def extract_articles(content: str) -> List[Article]:
    """استخراج المواد من القانون"""
    articles = []
    
    # أنماط البحث عن المواد
    patterns = [
        # المادة 1: أو المادة الأولى:
        r'(المادة\s*(\d+|[أ-ي]+))\s*[:\.]?\s*([^\n]+(?:\n(?![^\n]*المادة\s*(?:\d+|[أ-ي]+))[^\n]+)*)',
        # المادة 1 (بين قوسين)
        r'(المادة\s*(\d+|[أ-ي]+))\s*\([^)]*\)\s*[:\.]?\s*([^\n]+(?:\n(?![^\n]*المادة\s*(?:\d+|[أ-ي]+))[^\n]+)*)',
    ]
    
    # نمط موحد للمواد
    article_pattern = r'المادة\s*(\d+|[أ-ي]+)\s*(?:\([^)]*\))?\s*[:\.]?\s*'
    
    # تقسيم المحتوى إلى مواد
    parts = re.split(article_pattern, content)
    
    if len(parts) > 1:
        # معالجة الأجزاء المقسمة
        i = 1
        while i < len(parts):
            if i < len(parts):
                article_num = parts[i]
                if i + 1 < len(parts):
                    article_text = parts[i + 1]
                    # تنظيف النص
                    article_text = article_text.strip()
                    # إيقاف عند المادة التالية
                    next_article = re.search(r'\n\s*المادة\s*', article_text)
                    if next_article:
                        article_text = article_text[:next_article.start()]
                    
                    if len(article_text) > 10:
                        articles.append(Article(
                            article=f"المادة {article_num}",
                            text=article_text.strip()
                        ))
                i += 2
            else:
                i += 1
    
    # إذا لم يتم العثور على مواد، نبحث بطريقة أخرى
    if not articles:
        lines = content.split('\n')
        current_article = None
        current_text = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # البحث عن بداية مادة جديدة
            match = re.match(r'المادة\s*(\d+|[أ-ي]+)\s*[:\.]?\s*(.*)', line)
            if match:
                # حفظ المادة السابقة
                if current_article and current_text:
                    articles.append(Article(
                        article=f"المادة {current_article}",
                        text=' '.join(current_text)
                    ))
                current_article = match.group(1)
                current_text = [match.group(2)] if match.group(2) else []
            elif current_article:
                current_text.append(line)
        
        # حفظ آخر مادة
        if current_article and current_text:
            articles.append(Article(
                article=f"المادة {current_article}",
                text=' '.join(current_text)
            ))
    
    return articles


def classify_law(title: str, content: str) -> str:
    """تصنيف القانون"""
    combined_text = (title + " " + content[:2000]).lower()
    
    for category, keywords in LAW_CATEGORIES.items():
        for keyword in keywords:
            if keyword in combined_text:
                return category
    
    return "أخرى"


def is_existing_law(title: str, number: str, content: str) -> bool:
    """التحقق مما إذا كان القانون موجوداً بالفعل"""
    title_lower = title.lower()
    content_start = content[:500].lower()
    
    # التحقق من الاسم
    for keyword in EXISTING_KEYWORDS:
        if keyword in title_lower or keyword in content_start:
            return True
    
    # التحقق من الرقم
    for num in EXISTING_NUMBERS:
        if num in number or num in title or num in content[:1000]:
            return True
    
    # تحقق خاص لبعض القوانين
    special_checks = [
        ("قانون المدني", "القانون المدني"),
        ("قانون الأسرة", "قانون الأسرة"),
        ("العقوبات", "قانون العقوبات"),
        ("الجنسية", "قانون الجنسية"),
        ("البحري", "القانون البحري"),
    ]
    
    for check, law_name in special_checks:
        if check in title_lower or check in content_start:
            return True
    
    return False


def should_skip_law(title: str, content: str) -> bool:
    """تحديد ما إذا كان يجب تجاوز هذا القانون"""
    # تجاوز القوانين الفارغة أو غير المفيدة
    if title in ["محتوى", "ملاحظة مهمة", "ا", "الملاحق", "التنسيق"]:
        return True
    
    # تجاوز صفحات الاختصاصات المحض
    if "اختصاص المحاكم" in title or "اختصاص المجالس" in title:
        return True
    
    # تجاوز الفهارس والجداول
    if "قوائم الجرائم" in title or "المادة 526 مكرر" in title:
        return True
    
    # تجاوز العناصر القصيرة جداً
    if len(content) < 1000:
        return True
    
    return False


def process_law(entry: Dict[str, Any], index: int) -> Optional[ProcessedLaw]:
    """معالجة قانون واحد"""
    content = entry.get('content', '')
    url = entry.get('url', '')
    
    # تنظيف المحتوى
    content = clean_text(content)
    
    # استخراج العنوان
    title = extract_title(content)
    
    # التحقق من التجاوز
    if should_skip_law(title, content):
        print(f"[تجاوز] {index}. {title[:50]}...")
        return None
    
    # استخراج الرقم والتاريخ
    number = extract_number(title, content)
    date = extract_date(content)
    
    # التحقق من التكرار
    if is_existing_law(title, number, content):
        print(f"[مكرر] {index}. {title[:50]}... (رقم: {number})")
        return None
    
    # استخراج المواد
    articles = extract_articles(content)
    
    # تصنيف القانون
    category = classify_law(title, content)
    
    # إنشاء كائن القانون
    law = ProcessedLaw(
        title=title,
        number=number,
        date=date,
        category=category,
        articles=articles,
        source_url=url,
        total_articles=len(articles),
        developer_credit="تم تصميم و اعداد و تطوير من طرف الاستاذ سايج محمد - منظمة المحامين الجزائر - افريل 2026"
    )
    
    print(f"[نجاح] {index}. {title[:50]}... ({len(articles)} مادة)")
    return law


def main():
    print("=" * 60)
    print("معالجة القوانين الجزائرية")
    print("=" * 60)
    
    # قراءة الملف
    input_file = '/home/z/my-project/upload/laws_full.json'
    output_file = '/home/z/my-project/download/processed_laws.json'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"\nإجمالي القوانين في الملف: {len(data)}")
    print("-" * 60)
    
    # معالجة كل قانون
    processed_laws = []
    skipped_count = 0
    duplicate_count = 0
    
    for i, entry in enumerate(data, 1):
        result = process_law(entry, i)
        if result:
            processed_laws.append(asdict(result))
        else:
            skipped_count += 1
    
    # إحصائيات
    print("\n" + "=" * 60)
    print("النتائج:")
    print(f"  - قوانين معالجة: {len(processed_laws)}")
    print(f"  - قوانين مستبعدة: {skipped_count}")
    print("=" * 60)
    
    # حفظ النتيجة
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(processed_laws, f, ensure_ascii=False, indent=2)
    
    print(f"\nتم حفظ النتيجة في: {output_file}")
    
    # عرض ملخص التصنيفات
    categories = {}
    for law in processed_laws:
        cat = law['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\nتوزيع التصنيفات:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  - {cat}: {count}")


if __name__ == "__main__":
    main()
