/**
 * ═══════════════════════════════════════════════════════════════
 * الخطوة 1: استخراج النصوص من ملفات PDF
 * ═══════════════════════════════════════════════════════════════
 * 
 * هذا السكريبت يقرأ ملفات PDF من مجلد pdfs-input/
 * ويستخرج النصوص ويحفظها كملفات Markdown في md-output/
 * 
 * الاستخدام:
 *   1. ضع ملفات PDF في مجلد: scripts/pdf-processor/pdfs-input/
 *   2. شغّل: npm run extract
 *   3. النتيجة: ملفات MD في مجلد: scripts/pdf-processor/md-output/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_DIR = path.join(__dirname, 'pdfs-input');
const OUTPUT_DIR = path.join(__dirname, 'md-output');
const METADATA_FILE = path.join(__dirname, 'extraction-metadata.json');

// التأكد من وجود المجلدات
if (!fs.existsSync(INPUT_DIR)) {
  fs.mkdirSync(INPUT_DIR, { recursive: true });
  console.log('📁 تم إنشاء مجلد الإدخال:', INPUT_DIR);
  console.log('⚠️  ضع ملفات PDF فيه ثم أعد تشغيل السكريبت');
  process.exit(0);
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function extractTextFromPdf(filePath) {
  try {
    // استخدام pdf-parse البسيط
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    
    return {
      text: data.text,
      pages: data.numpages,
      metadata: data.info || {},
      creator: data.info?.Creator || 'غير معروف',
      producer: data.info?.Producer || 'غير معروف',
    };
  } catch (error) {
    console.error(`  ❌ خطأ في: ${path.basename(filePath)}: ${error.message}`);
    return null;
  }
}

function cleanText(text) {
  if (!text) return '';
  
  return text
    // إزالة الأحرف غير المرغوبة
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // توحيد أسطر النص العربي
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // إزالة الأسطر الفارغة المتعددة
    .replace(/\n{3,}/g, '\n\n')
    // إزالة المسافات الزائدة
    .replace(/  +/g, ' ')
    .trim();
}

function formatAsMarkdown(extractedData, fileName) {
  const { text, pages, metadata } = extractedData;
  const cleanedText = cleanText(text);
  
  const mdContent = `---
source: ${fileName}
pages: ${pages}
creator: ${metadata.Creator || 'غير معروف'}
extraction_date: ${new Date().toISOString().split('T')[0]}
---

# ${fileName.replace(/\.pdf$/i, '')}

${cleanedText}
`;
  
  return mdContent;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  📄 استخراج النصوص من ملفات PDF');
  console.log('═══════════════════════════════════════════════════\n');
  
  // البحث عن ملفات PDF
  const pdfFiles = fs.readdirSync(INPUT_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .sort();
  
  if (pdfFiles.length === 0) {
    console.log('⚠️  لا توجد ملفات PDF في مجلد الإدخال');
    console.log('📁 ضع ملفات PDF في:', INPUT_DIR);
    process.exit(0);
  }
  
  console.log(`📊 عدد ملفات PDF المكتشفة: ${pdfFiles.length}\n`);
  
  const results = [];
  let successCount = 0;
  let failCount = 0;
  let totalSize = 0;
  
  for (let i = 0; i < pdfFiles.length; i++) {
    const file = pdfFiles[i];
    const filePath = path.join(INPUT_DIR, file);
    const fileSize = fs.statSync(filePath).size;
    totalSize += fileSize;
    
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
    const progress = `[${(i + 1).toString().padStart(3)}/${pdfFiles.length}]`;
    
    process.stdout.write(`  ${progress} 📄 ${file} (${sizeMB} MB) ... `);
    
    const extracted = await extractTextFromPdf(filePath);
    
    if (extracted && extracted.text && extracted.text.trim().length > 0) {
      const mdContent = formatAsMarkdown(extracted, file);
      const mdFileName = file.replace(/\.pdf$/i, '.md');
      const outputPath = path.join(OUTPUT_DIR, mdFileName);
      
      fs.writeFileSync(outputPath, mdContent, 'utf-8');
      
      const textLength = extracted.text.trim().length;
      console.log(`✅ (${extracted.pages} صفحة, ${textLength.toLocaleString()} حرف)`);
      
      results.push({
        file,
        mdFile: mdFileName,
        pages: extracted.pages,
        textLength,
        fileSize,
        status: 'success'
      });
      successCount++;
    } else {
      console.log('❌ (فشل في الاستخراج)');
      results.push({
        file,
        status: 'failed',
        error: 'فشل في استخراج النص'
      });
      failCount++;
    }
  }
  
  // حفظ البيانات الوصفية
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
  const metadata = {
    extractionDate: new Date().toISOString(),
    totalFiles: pdfFiles.length,
    totalSizeMB,
    successCount,
    failCount,
    files: results
  };
  
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  📊 ملخص الاستخراج');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  ✅ نجاح: ${successCount} ملف`);
  console.log(`  ❌ فشل: ${failCount} ملف`);
  console.log(`  📦 الحجم الإجمالي: ${totalSizeMB} MB`);
  console.log(`  📁 مجلد الإخراج: ${OUTPUT_DIR}`);
  console.log(`  📋 البيانات الوصفية: ${METADATA_FILE}`);
  console.log('═══════════════════════════════════════════════════\n');
  
  if (failCount > 0) {
    console.log('⚠️  بعض الملفات فشل استخراجها. قد تكون ملفات PDF تحتوي على صور بدلاً من نصوص.');
    console.log('   في هذه الحالة، استخدم OCR للتحويل.');
  }
  
  if (successCount > 0) {
    console.log('✅ الخطوة التالية: شغّل "npm run parse" لتحليل النصوص باستخدام الذكاء الاصطناعي');
  }
}

main().catch(console.error);
