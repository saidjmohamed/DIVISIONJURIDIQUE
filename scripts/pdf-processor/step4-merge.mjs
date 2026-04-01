/**
 * ═══════════════════════════════════════════════════════════════
 * الخطوة 4: دمج القرارات في مكتبة الاجتهادات
 * ═══════════════════════════════════════════════════════════════
 * 
 * يدمج القرارات الجديدة المصنفة مع البيانات الحالية
 * ويحدّث ملف index.json وملفات الغرف
 * 
 * ⚠️  ينشئ نسخة احتياطية تلقائياً قبل التعديل
 * 
 * الاستخدام: npm run merge
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLASSIFIED_DIR = path.join(__dirname, 'classified');
const JURISPRUDENCE_DIR = path.join(__dirname, '..', '..', 'public', 'jurisprudence');
const BACKUP_DIR = path.join(__dirname, 'backup', new Date().toISOString().split('T')[0]);

const CHAMBERS = {
  civil:        { id: 'civil',        name: 'الغرفة المدنية',            icon: '⚖️',  color: '#2563eb' },
  penal:        { id: 'penal',        name: 'الغرفة الجنائية',           icon: '🔒',  color: '#dc2626' },
  realestate:   { id: 'realestate',   name: 'الغرفة العقارية',           icon: '🏠',  color: '#059669' },
  family:       { id: 'family',       name: 'غرفة الأحوال الشخصية',      icon: '👨‍👩‍👧', color: '#7c3aed' },
  commercial:   { id: 'commercial',   name: 'الغرفة التجارية والبحرية',  icon: '💼',  color: '#d97706' },
  social:       { id: 'social',       name: 'الغرفة الاجتماعية',         icon: '👷',  color: '#0891b2' },
  compensation: { id: 'compensation', name: 'لجنة التعويض',              icon: '💰',  color: '#be185d' },
  misdemeanor:  { id: 'misdemeanor',  name: 'غرفة الجنح والمخالفات',     icon: '📋',  color: '#6366f1' },
  combined:     { id: 'combined',     name: 'الغرف المجتمعة',             icon: '🏛️',  color: '#1a3a5c' },
};

function createBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const files = fs.readdirSync(JURISPRUDENCE_DIR);
  let backedUp = 0;
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const src = path.join(JURISPRUDENCE_DIR, file);
      const dest = path.join(BACKUP_DIR, file);
      fs.copyFileSync(src, dest);
      backedUp++;
    }
  }
  
  return backedUp;
}

function mergeDecisions(existing, newDecisions) {
  // إنشاء مجموعة من الأرقام الموجودة
  const existingNumbers = new Set(existing.map(d => String(d.number)));
  
  let added = 0;
  let skipped = 0;
  let updated = 0;
  
  for (const decision of newDecisions) {
    const num = String(decision.number);
    
    if (existingNumbers.has(num)) {
      // تحقق مما إذا كانت البيانات الجديدة أكمل
      const existingIdx = existing.findIndex(d => String(d.number) === num);
      const existingDecision = existing[existingIdx];
      
      // إذا كانت البيانات الجديدة تحتوي نصاً أطول، حدّثها
      if (decision.fullText && (!existingDecision.fullText || decision.fullText.length > existingDecision.fullText.length)) {
        existing[existingIdx] = {
          ...existingDecision,
          ...decision,
          id: existingDecision.id, // حافظ على المعرف الأصلي
        };
        updated++;
      } else {
        skipped++;
      }
    } else {
      // قرار جديد
      existing.push(decision);
      existingNumbers.add(num);
      added++;
    }
  }
  
  return { merged: existing, added, skipped, updated };
}

function buildIndex(chamberCounts) {
  const chambers = Object.entries(CHAMBERS).map(([id, info]) => ({
    id,
    name: info.name,
    icon: info.icon,
    color: info.color,
    count: chamberCounts[id] || 0
  }));
  
  const totalCount = Object.values(chamberCounts).reduce((a, b) => a + b, 0);
  
  return {
    totalCount,
    lastUpdate: new Date().toISOString().split('T')[0],
    chambers
  };
}

function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  🔗 دمج القرارات في مكتبة الاجتهادات');
  console.log('═══════════════════════════════════════════════════\n');
  
  // التحقق من وجود ملفات مصنفة
  if (!fs.existsSync(CLASSIFIED_DIR)) {
    console.log('⚠️  لا يوجد مجلد classified');
    console.log('   شغّل أولاً: npm run classify');
    process.exit(0);
  }
  
  const classifiedFiles = fs.readdirSync(CLASSIFIED_DIR)
    .filter(f => f.endsWith('.json'));
  
  if (classifiedFiles.length === 0) {
    console.log('⚠️  لا توجد ملفات مصنفة');
    process.exit(0);
  }
  
  // إنشاء نسخة احتياطية
  console.log('📦 إنشاء نسخة احتياطية...');
  const backedUp = createBackup();
  console.log(`  ✅ تم نسخ ${backedUp} ملف إلى: ${BACKUP_DIR}\n`);
  
  const chamberCounts = {};
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalUpdated = 0;
  
  for (const file of classifiedFiles) {
    const chamberId = file.replace('.json', '');
    const chamber = CHAMBERS[chamberId];
    
    if (!chamber) {
      console.log(`  ⚠️  غرفة غير معروفة: ${chamberId} — تخطي`);
      continue;
    }
    
    const classifiedPath = path.join(CLASSIFIED_DIR, file);
    const newDecisions = JSON.parse(fs.readFileSync(classifiedPath, 'utf-8'));
    
    if (!Array.isArray(newDecisions) || newDecisions.length === 0) continue;
    
    // تحميل البيانات الحالية
    const existingPath = path.join(JURISPRUDENCE_DIR, file);
    let existing = [];
    
    if (fs.existsSync(existingPath)) {
      existing = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
      if (!Array.isArray(existing)) existing = [];
    }
    
    // الدمج
    const { merged, added, skipped, updated } = mergeDecisions(existing, newDecisions);
    
    // حفظ الملف المدمج
    fs.writeFileSync(existingPath, JSON.stringify(merged, null, 2), 'utf-8');
    
    chamberCounts[chamberId] = merged.length;
    totalAdded += added;
    totalSkipped += skipped;
    totalUpdated += updated;
    
    console.log(
      `  ${chamber.icon} ${chamber.name}: ${existing.length} حالي + ${added} جديد + ${updated} محدّث = ${merged.length} (تخطي: ${skipped})`
    );
  }
  
  // تحديث ملف الفهرس
  const index = buildIndex(chamberCounts);
  const indexPath = path.join(JURISPRUDENCE_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  📊 ملخص الدمج');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  ✅ قرارات جديدة: ${totalAdded}`);
  console.log(`  🔄 قرارات محدّثة: ${totalUpdated}`);
  console.log(`  ⏭️  قرارات متكررة: ${totalSkipped}`);
  console.log(`  📊 الإجمالي: ${index.totalCount} قرار`);
  console.log(`  📦 النسخة الاحتياطية: ${BACKUP_DIR}`);
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('✅ تم الدمج بنجاح!');
  console.log('🌐 لإظهار التغييرات على الموقع، أعد النشر:');
  console.log('   cd /home/z/my-project/DIVISIONJURIDIQUE && npx vercel --prod --yes');
}

main();
