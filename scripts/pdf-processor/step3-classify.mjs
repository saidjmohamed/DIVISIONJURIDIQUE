/**
 * ═══════════════════════════════════════════════════════════════
 * الخطوة 3: تصنيف القرارات حسب الغرف القضائية
 * ═══════════════════════════════════════════════════════════════
 * 
 * يقرأ ملفات JSON المحللة ويصنفها حسب الغرف
 * ثم يدمجها مع البيانات الحالية
 * 
 * الاستخدام: npm run classify
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PARSED_DIR = path.join(__dirname, 'parsed-json');
const CLASSIFIED_DIR = path.join(__dirname, 'classified');
const JURISPRUDENCE_DIR = path.join(__dirname, '..', '..', 'public', 'jurisprudence');

if (!fs.existsSync(CLASSIFIED_DIR)) {
  fs.mkdirSync(CLASSIFIED_DIR, { recursive: true });
}

const CHAMBERS = {
  civil: {
    id: 'civil',
    name: 'الغرفة المدنية',
    icon: '⚖️',
    color: '#2563eb',
    keywords: ['مدني', 'مدنية', 'التزام', 'عقد', 'مسؤولية', 'إثبات', 'ملكية', 'حيازة', 'رهن', 'كفالة', 'شفعة', 'هبة', 'بيع', 'إيجار', 'دين', 'تقادم', 'تبليغ', 'تسجيل', 'وكالة', 'ضمان', 'تأمين', 'محاماة']
  },
  penal: {
    id: 'penal',
    name: 'الغرفة الجنائية',
    icon: '🔒',
    color: '#dc2626',
    keywords: ['جنائي', 'جنائية', 'جريمة', 'سرقة', 'قتل', 'اغتصاب', 'نصب', 'احتيال', 'تزوير', 'رشوة', 'اختلاس', 'مسكن', 'سجن', 'عقوبة', 'متلبس', 'توقيف', 'تحقيق جزائي', 'تنفيذ عقوبة', 'إفراج']
  },
  realestate: {
    id: 'realestate',
    name: 'الغرفة العقارية',
    icon: '🏠',
    color: '#059669',
    keywords: ['عقاري', 'عقارية', 'عقار', 'أرض', 'بناء', 'تشيد', 'تعمير', 'حوض عقاري', 'تحفيظ', 'شهر عقاري', 'ملكية عقارية', 'حق عيني', 'تقسيم', 'تصرف في عقار', 'حبس عقاري']
  },
  family: {
    id: 'family',
    name: 'غرفة الأحوال الشخصية',
    icon: '👨‍👩‍👧',
    color: '#7c3aed',
    keywords: ['أحوال شخصية', 'زواج', 'طلاق', 'خلع', 'حضانة', 'نفقة', 'إرث', 'ميراث', 'وصية', 'وصاية', 'قاصر', 'أبوين', 'أطفال', 'نسب', 'خطبة', 'معاشقة', 'عضل']
  },
  commercial: {
    id: 'commercial',
    name: 'الغرفة التجارية والبحرية',
    icon: '💼',
    color: '#d97706',
    keywords: ['تجاري', 'تجارية', 'بحري', 'بحرية', 'شركة', 'أسهم', 'رأس مال', 'إفلاس', 'تصفية', 'تحكيم', 'جمركي', 'شحن', 'بوليصة', 'بنكي', 'قرض', 'فاتورة', 'كمبيالة']
  },
  social: {
    id: 'social',
    name: 'الغرفة الاجتماعية',
    icon: '👷',
    color: '#0891b2',
    keywords: ['اجتماعي', 'اجتماعية', 'عمل', 'عامل', 'عمال', 'اجور', 'راتب', 'صندوق', 'ضمان اجتماعي', 'تقاعد', 'حادث عمل', 'مرض مهني', 'فصل', 'طرح', 'نزاع شغل']
  },
  compensation: {
    id: 'compensation',
    name: 'لجنة التعويض',
    icon: '💰',
    color: '#be185d',
    keywords: ['تعويض', 'حرب', 'إرهاب', 'كارثة', 'ضرر', 'لجنة تعويض', 'ضحايا', 'خسارة']
  },
  misdemeanor: {
    id: 'misdemeanor',
    name: 'غرفة الجنح والمخالفات',
    icon: '📋',
    color: '#6366f1',
    keywords: ['جنحة', 'مخالفة', 'جنح', 'مخالفات', 'ضرب', 'إيذاء', 'تهديد', 'سب', 'قذف', 'تعطيل', 'حبس', 'غرامة']
  },
  combined: {
    id: 'combined',
    name: 'الغرف المجتمعة',
    icon: '🏛️',
    color: '#1a3a5c',
    keywords: ['غرف مجتمعة', 'مجتمعة', 'غرف موسعة', 'توحيد اجتهاد']
  }
};

function classifyDecision(decision) {
  // إذا كان التصنيف موجوداً مسبقاً من AI، نتأكد منه
  if (decision.chamberId && CHAMBERS[decision.chamberId]) {
    return decision.chamberId;
  }
  
  const textToAnalyze = [
    decision.subject || '',
    decision.principle || '',
    decision.keywords?.join(' ') || '',
    decision.fullText?.substring(0, 500) || ''
  ].join(' ').toLowerCase();
  
  let bestChamber = 'civil'; // افتراضي
  let bestScore = 0;
  
  for (const [chamberId, chamber] of Object.entries(CHAMBERS)) {
    let score = 0;
    
    for (const keyword of chamber.keywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = textToAnalyze.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestChamber = chamberId;
    }
  }
  
  return bestChamber;
}

function loadExistingData(chamberId) {
  const filePath = path.join(JURISPRUDENCE_DIR, `${chamberId}.json`);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  📋 تصنيف القرارات حسب الغرف القضائية');
  console.log('═══════════════════════════════════════════════════\n');
  
  const jsonFiles = fs.readdirSync(PARSED_DIR)
    .filter(f => f.toLowerCase().endsWith('.json'))
    .sort();
  
  if (jsonFiles.length === 0) {
    console.log('⚠️  لا توجد ملفات JSON في مجلد parsed-json');
    console.log('   شغّل أولاً: npm run parse');
    process.exit(0);
  }
  
  console.log(`📊 عدد ملفات JSON: ${jsonFiles.length}\n`);
  
  // جمع كل القرارات
  const allDecisions = [];
  const chamberStats = {};
  
  for (const file of jsonFiles) {
    const filePath = path.join(PARSED_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    if (!Array.isArray(data)) continue;
    
    for (const decision of data) {
      // تصنيف القرار
      const chamberId = classifyDecision(decision);
      const chamber = CHAMBERS[chamberId];
      
      decision.chamberId = chamberId;
      decision.chamber = chamber.name;
      
      allDecisions.push(decision);
      
      if (!chamberStats[chamberId]) {
        chamberStats[chamberId] = { count: 0, name: chamber.name };
      }
      chamberStats[chamberId].count++;
    }
  }
  
  console.log(`⚖️  إجمالي القرارات: ${allDecisions.length}\n`);
  
  // عرض إحصائيات التصنيف
  console.log('📊 التصنيف حسب الغرف:');
  for (const [id, stats] of Object.entries(chamberStats)) {
    const chamber = CHAMBERS[id];
    console.log(`  ${chamber.icon} ${stats.name}: ${stats.count} قرار`);
  }
  console.log('');
  
  // تصنيف القرارات في ملفات منفصلة
  const classified = {};
  for (const decision of allDecisions) {
    const chamberId = decision.chamberId;
    if (!classified[chamberId]) {
      classified[chamberId] = [];
    }
    classified[chamberId].push(decision);
  }
  
  // حفظ الملفات المصنفة
  for (const [chamberId, decisions] of Object.entries(classified)) {
    const filePath = path.join(CLASSIFIED_DIR, `${chamberId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(decisions, null, 2), 'utf-8');
    console.log(`  ✅ ${CHAMBERS[chamberId].icon} ${CHAMBERS[chamberId].name}: ${decisions.length} قرار → ${chamberId}.json`);
  }
  
  // حساب القرارات الجديدة (غير الموجودة في البيانات الحالية)
  console.log('\n📊 مقارنة مع البيانات الحالية:');
  let newDecisions = 0;
  
  for (const [chamberId, decisions] of Object.entries(classified)) {
    const existing = loadExistingData(chamberId);
    const existingNumbers = new Set(existing.map(d => d.number));
    
    const newOnes = decisions.filter(d => !existingNumbers.has(d.number));
    console.log(`  ${CHAMBERS[chamberId].icon} ${CHAMBERS[chamberId].name}: ${existing.length} حالي + ${newOnes.length} جديد = ${existing.length + newOnes.length}`);
    newDecisions += newOnes.length;
  }
  
  console.log(`\n  📈 إجمالي القرارات الجديدة: ${newDecisions}`);
  console.log(`  📁 مجلد التصنيف: ${CLASSIFIED_DIR}`);
  console.log('\n═══════════════════════════════════════════════════\n');
  
  if (newDecisions > 0) {
    console.log('✅ الخطوة التالية: شغّل "npm run merge" لدمج القرارات في مكتبة الاجتهادات');
  } else {
    console.log('ℹ️  لا توجد قرارات جديدة للدمج');
  }
}

main();
