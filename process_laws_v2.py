#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سكريبت معالجة القوانين الجزائرية - النسخة المحسنة
- تنظيف البيانات
- استخراج المواد
- منع التكرار
- تجهيز للبحث النصي
- إخراج JSON منظم
"""

import json
import re
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from datetime import datetime

# القوانين الموجودة حالياً في التطبيق (يتم استبعادها)
EXISTING_LAWS = {
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
    "قانون المدني", "القانون المدني", "قانون الأسرة", "قانون الأسرة",
    "القانون التجاري", "قانون البحري", "القانون البحري",
    "الإجراءات الجزائية", "الإجراءات الجبائية",
    "الإجراءات المدنية والإدارية", "قانون العقوبات", "قانون الجنسية",
    "قانون المرور", "قانون المنافسة", "تنصيب العمال",
    "تسوية النزاعات الفردية", "النشاط السمعي البصري",
    "الاتجار بالبشر", "عصابات الأحياء",
]

# أرقام القوانين الموجودة
EXISTING_NUMBERS = [
    "75-58", "75-59", "84-11", "88-03", "14-02", "06-08", 
    "08-09", "66-156", "70-86", "09-01", "03-03", "04-19",
    "90-04", "14-05", "14-06"
]

# تصنيفات القوانين
LAW_CATEGORIES = {
    "مدني": ["مدني", "الأحوال الشخصية", "الحالة المدنية", "اللقب", "النفقة", "عقود"],
    "أسرة": ["أسرة", "زواج", "طلاق", "ميراث", "النفقة", "حضانة"],
    "تجاري": ["تجاري", "تجارة", "شركات", "بورصة", "منافسة", "استثمار", "مضاربة"],
    "جزائي": ["عقوبات", "جزائي", "جريمة", "عقوبة", "سجون", "اعتداء", "اختطاف", "تهريب"],
    "إداري": ["إداري", "وظيفة عمومية", "بلدية", "ولاية", "جماعات محلية", "عقود إدارية"],
    "دستوري": ["دستور", "الجنسية", "انتخابات"],
    "عمل": ["عمل", "تشغيل", "أجراء", "نزاعات العمل", "ضمان اجتماعي", "تقاعد", "أجور"],
    "مالي": ["ضرائب", "جبائية", "رسوم", "جمارك", "مالية", "محاسبة"],
    "بيئة": ["بيئة", "غابات", "شواطئ", "ساحل", "نفايات", "فلاحي", "زراعة"],
    "صحة": ["صحة", "طبي", "بيطري", "صيدلة", "مستشفيات"],
    "إعلام": ["إعلام", "سمعي بصري", "اتصالات", "صحافة"],
    "أمن": ["أمن", "دفاع", "عسكري", "أسلحة", "مرور", "شرطة"],
    "طاقة": ["كهرباء", "غاز", "محروقات", "مناجم", "بترول"],
    "عقاري": ["عقاري", "سجل عقاري", "أملاك", "نزع ملكية", "تعمير", "ملكية"],
    "بحري": ["بحري", "ملاحة", "موانئ"],
    "اجتماعي": ["اجتماعي", "طفولة", "مسنين", "إعاقة", "تكفل", "حماية اجتماعية"],
    "نقل": ["نقل", "سكك حديدية", "طيران", "مطارات"],
    "سياحي": ["سياحة", "فنادق", "مواقع سياحية"],
}


@dataclass
class Article:
    article: str
    text: str
    # كلمات مفتاحية للبحث
    keywords: List[str] = None
    
    def __post_init__(self):
        if self.keywords is None:
            # استخراج الكلمات المفتاحية من النص
            self.keywords = extract_keywords(self.text)


@dataclass
class ProcessedLaw:
    title: str
    number: str
    date: str
    category: str
    subcategory: str
    articles: List[Dict]
    source_url: str
    total_articles: int
    developer_credit: str
    # حقول للبحث
    searchable_text: str
    keywords: List[str]
    # معلومات إضافية
    law_type: str  # قانون، مرسوم، أمر
    official_journal: str  # الجريدة الرسمية


def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
    """استخراج الكلمات المفتاحية من النص"""
    # الكلمات المستبعدة
    stop_words = {'في', 'من', 'إلى', 'على', 'عن', 'مع', 'أو', 'و', 'ما', 'لا', 'هذا', 'هذه', 
                  'تلك', 'ذلك', 'التي', 'الذي', 'التى', 'الذى', 'أن', 'إن', 'قد', 'كان', 'كانت',
                  'يكون', 'تكون', 'هو', 'هي', 'هم', 'هن', 'نا', 'كم', 'هم', 'أن', 'إلى', 'هذا'}
    
    # استخراج الكلمات
    words = re.findall(r'[\u0600-\u06FF]{3,}', text)
    
    # حساب التكرار
    word_freq = {}
    for word in words:
        if word not in stop_words:
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # ترتيب حسب التكرار
    sorted_words = sorted(word_freq.items(), key=lambda x: -x[1])
    
    return [word for word, _ in sorted_words[:max_keywords]]


def clean_text(text: str) -> str:
    """تنظيف النص من العناصر غير المرغوبة"""
    patterns_to_remove = [
        r'تصميم و إخراج الأستاذ بوطاس الحاسن.*?2025',
        r'تصميم و إخراج الأستاذ بوطاس الحاسن.*?2026',
        r'الرجوع للصفحة الرئيسية',
        r'آخر تنسيق.*?\d{4}',
        r'اخر تنسيق.*?\d{4}',
        r'⬆️',
        r'⬇️',
        r'إعداد عضو المنظمة الأستاذ بوطاس الحاسن.*',
    ]
    
    for pattern in patterns_to_remove:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    # تنظيف الفراغات
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
        if any(skip in line for skip in ['تصميم و إخراج', 'الرجوع للصفحة', 'اخر تنسيق', 'آخر تنسيق', '⬆', '⬇']):
            continue
        if len(line) > 5:
            return line
    return "غير محدد"


def extract_number(title: str, content: str) -> str:
    """استخراج رقم القانون"""
    patterns = [
        r'رقم\s*(\d{2,4}[-/]\d{2,4})',
        r'(\d{2,4}[-/]\d{2,4})',
        r'رقم\s*(\d+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, title)
        if match:
            return match.group(1)
    
    for pattern in patterns:
        match = re.search(pattern, content[:1500])
        if match:
            return match.group(1)
    
    return ""


def extract_date(content: str) -> str:
    """استخراج تاريخ الإصدار"""
    patterns = [
        r'(\d{1,2}\s+(?:محرم|صفر|ربيع الأول|ربيع الثاني|جمادى الأولى|جمادى الثانية|رجب|شعبان|رمضان|شوال|ذو القعدة|ذو الحجة)\s+عام\s+\d{4})\s*الموافق\s*(\d{1,2}\s+(?:يناير|فبراير|مارس|أبريل|ماي|يونيو|يوليو|غشت|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s+سنة\s+\d{4})',
        r'(\d{1,2}\s+(?:يناير|فبراير|مارس|أبريل|ماي|يونيو|يوليو|غشت|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s+سنة?\s*\d{4})',
        r'سنة\s+(\d{4})',
        r'\(ج\s*ر\s*\d+[-–]\s*(\d{4})\)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content[:2500])
        if match:
            if len(match.groups()) > 1 and match.group(2):
                return f"{match.group(1)} الموافق {match.group(2)}"
            return match.group(1)
    
    return ""


def extract_official_journal(content: str) -> str:
    """استخراج رقم الجريدة الرسمية"""
    pattern = r'\(?\s*ج\s*\.?\s*ر\s*\.?\s*(\d+[-–]\d{4})\s*\)?'
    match = re.search(pattern, content[:2000])
    if match:
        return f"ج ر {match.group(1)}"
    return ""


def extract_law_type(title: str, content: str) -> str:
    """تحديد نوع القانون"""
    combined = (title + " " + content[:500]).lower()
    
    if "دستور" in combined:
        return "دستور"
    elif "أمر" in combined or "امر" in combined:
        return "أمر"
    elif "مرسوم رئاسي" in combined:
        return "مرسوم رئاسي"
    elif "مرسوم تنفيذي" in combined or "مرسوم" in combined:
        return "مرسوم تنفيذي"
    elif "قانون" in combined:
        return "قانون"
    else:
        return "نص تنظيمي"


def extract_articles(content: str) -> List[Dict]:
    """استخراج المواد من القانون"""
    articles = []
    
    # نمط المواد
    article_pattern = r'المادة\s*(\d+|[أ-ي]+)\s*(?:\([^)]*\))?\s*[:\.]?\s*'
    
    # تقسيم المحتوى
    parts = re.split(article_pattern, content)
    
    if len(parts) > 1:
        i = 1
        while i < len(parts):
            if i < len(parts):
                article_num = parts[i]
                if i + 1 < len(parts):
                    article_text = parts[i + 1].strip()
                    
                    # إيقاف عند المادة التالية
                    next_article = re.search(r'\n\s*المادة\s*', article_text)
                    if next_article:
                        article_text = article_text[:next_article.start()]
                    
                    if len(article_text) > 10:
                        articles.append({
                            "article": f"المادة {article_num}",
                            "text": article_text.strip(),
                            "keywords": extract_keywords(article_text, 5)
                        })
                i += 2
            else:
                i += 1
    
    # طريقة بديلة إذا لم يتم العثور على مواد
    if not articles:
        lines = content.split('\n')
        current_article = None
        current_text = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            match = re.match(r'المادة\s*(\d+|[أ-ي]+)\s*[:\.]?\s*(.*)', line)
            if match:
                if current_article and current_text:
                    text = ' '.join(current_text)
                    articles.append({
                        "article": f"المادة {current_article}",
                        "text": text,
                        "keywords": extract_keywords(text, 5)
                    })
                current_article = match.group(1)
                current_text = [match.group(2)] if match.group(2) else []
            elif current_article:
                current_text.append(line)
        
        if current_article and current_text:
            text = ' '.join(current_text)
            articles.append({
                "article": f"المادة {current_article}",
                "text": text,
                "keywords": extract_keywords(text, 5)
            })
    
    return articles


def classify_law(title: str, content: str) -> tuple:
    """تصنيف القانون"""
    combined_text = (title + " " + content[:3000]).lower()
    
    for category, keywords in LAW_CATEGORIES.items():
        for keyword in keywords:
            if keyword in combined_text:
                # تحديد التصنيف الفرعي
                subcategory = ""
                for kw in keywords:
                    if kw in combined_text:
                        subcategory = kw
                        break
                return category, subcategory
    
    return "أخرى", ""


def is_existing_law(title: str, number: str, content: str) -> bool:
    """التحقق مما إذا كان القانون موجوداً بالفعل"""
    title_lower = title.lower()
    content_start = content[:500].lower()
    
    for keyword in EXISTING_KEYWORDS:
        if keyword in title_lower or keyword in content_start:
            return True
    
    for num in EXISTING_NUMBERS:
        if num in number or num in title or num in content[:1000]:
            return True
    
    return False


def should_skip_law(title: str, content: str) -> bool:
    """تحديد ما إذا كان يجب تجاوز هذا القانون"""
    skip_titles = ["محتوى", "ملاحظة مهمة", "ا", "الملاحق", "التنسيق", "إعداد عضو المنظمة"]
    
    if title in skip_titles:
        return True
    
    if "اختصاص المحاكم" in title or "اختصاص المجالس" in title:
        return True
    
    if "قوائم الجرائم" in title or "المادة 526 مكرر" in title:
        return True
    
    if len(content) < 1000:
        return True
    
    return False


def create_searchable_text(law_data: Dict) -> str:
    """إنشاء نص قابل للبحث"""
    parts = [
        law_data.get('title', ''),
        law_data.get('number', ''),
        law_data.get('category', ''),
    ]
    
    # إضافة نص المواد الأولى
    articles = law_data.get('articles', [])
    for article in articles[:5]:
        parts.append(article.get('text', '')[:200])
    
    return ' '.join(parts)


def process_law(entry: Dict[str, Any], index: int) -> Optional[Dict]:
    """معالجة قانون واحد"""
    content = entry.get('content', '')
    url = entry.get('url', '')
    
    content = clean_text(content)
    title = extract_title(content)
    
    if should_skip_law(title, content):
        print(f"[تجاوز] {index}. {title[:50]}...")
        return None
    
    number = extract_number(title, content)
    date = extract_date(content)
    
    if is_existing_law(title, number, content):
        print(f"[مكرر] {index}. {title[:50]}... (رقم: {number})")
        return None
    
    articles = extract_articles(content)
    category, subcategory = classify_law(title, content)
    law_type = extract_law_type(title, content)
    official_journal = extract_official_journal(content)
    
    # إنشاء الكلمات المفتاحية
    all_text = title + " " + content[:2000]
    keywords = extract_keywords(all_text, 15)
    
    law = {
        "title": title,
        "number": number,
        "date": date,
        "category": category,
        "subcategory": subcategory,
        "articles": articles,
        "source_url": url,
        "total_articles": len(articles),
        "developer_credit": "تم تصميم و اعداد و تطوير من طرف الاستاذ سايج محمد - منظمة المحامين الجزائر - افريل 2026",
        "law_type": law_type,
        "official_journal": official_journal,
        "keywords": keywords,
        "searchable_text": "",  # سيتم ملؤها لاحقاً
    }
    
    # إنشاء النص القابل للبحث
    law['searchable_text'] = create_searchable_text(law)
    
    print(f"[نجاح] {index}. {title[:50]}... ({len(articles)} مادة)")
    return law


def main():
    print("=" * 70)
    print("معالجة القوانين الجزائرية - النسخة المحسنة")
    print("=" * 70)
    
    input_file = '/home/z/my-project/upload/laws_full.json'
    output_file = '/home/z/my-project/download/processed_laws.json'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"\nإجمالي القوانين في الملف: {len(data)}")
    print("-" * 70)
    
    processed_laws = []
    
    for i, entry in enumerate(data, 1):
        result = process_law(entry, i)
        if result:
            processed_laws.append(result)
    
    print("\n" + "=" * 70)
    print("النتائج:")
    print(f"  - قوانين معالجة: {len(processed_laws)}")
    print(f"  - قوانين مستبعدة: {len(data) - len(processed_laws)}")
    print("=" * 70)
    
    # إحصائيات
    total_articles = sum(law['total_articles'] for law in processed_laws)
    print(f"\n📊 إحصائيات:")
    print(f"   - إجمالي المواد: {total_articles}")
    
    # توزيع التصنيفات
    categories = {}
    for law in processed_laws:
        cat = law['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\n📁 توزيع التصنيفات:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"   - {cat}: {count}")
    
    # توزيع أنواع القوانين
    types = {}
    for law in processed_laws:
        t = law['law_type']
        types[t] = types.get(t, 0) + 1
    
    print("\n📄 توزيع أنواع النصوص:")
    for t, count in sorted(types.items(), key=lambda x: -x[1]):
        print(f"   - {t}: {count}")
    
    # حفظ النتيجة
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(processed_laws, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ تم حفظ النتيجة في: {output_file}")


if __name__ == "__main__":
    main()
