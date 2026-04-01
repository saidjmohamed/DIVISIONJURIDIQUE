/**
 * ═══════════════════════════════════════════════════════════════
 * الخطوة 2: تحليل النصوص باستخدام الذكاء الاصطناعي
 * ═══════════════════════════════════════════════════════════════
 * 
 * يقرأ ملفات MD المستخرجة ويحللها باستخدام AI
 * لاستخراج بيانات القرارات القضائية المنظمة
 * 
 * الاستخدام: npm run parse
 * 
 * ملاحظة: تحتاج مفتاح GEMINI_API_KEY أو OPENROUTER_API_KEY
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MD_DIR = path.join(__dirname, 'md-output');
const PARSED_DIR = path.join(__dirname, 'parsed-json');
const METADATA_FILE = path.join(__dirname, 'extraction-metadata.json');

if (!fs.existsSync(PARSED_DIR)) {
  fs.mkdirSync(PARSED_DIR, { recursive: true });
}

// الحصول على API Key
const API_KEY = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY;

const ANALYSIS_PROMPT = `أنت متخصص في تحليل قرارات المحكمة العليا الجزائرية. 

أعطيك نصاً من قرار قضائي (أو مجموعة قرارات) مأخوذ من ملف PDF.

مهمتك: استخرج كل قرار قضائي منفصل من النص وأعيده بتنسيق JSON صحيح.

## الغرف القضائية الممكنة:
- civil: الغرفة المدنية
- penal: الغرفة الجنائية
- realestate: الغرفة العقارية
- family: غرفة الأحوال الشخصية
- commercial: الغرفة التجارية والبحرية
- social: الغرفة الاجتماعية
- compensation: لجنة التعويض
- misdemeanor: غرفة الجنح والمخالفات
- combined: الغرف المجتمعة

## قواعد التحليل:
1. اقرأ النص كاملاً وحدد كل قرار قضائي منفصل
2. لكل قرار استخرج:
   - number: رقم القرار (مثال: "327227" أو "رقم غير معروف-التاريخ")
   - date: تاريخ القرار بصيغة DD/MM/YYYY
   - chamber: اسم الغرفة بالعربي
   - chamberId: معرف الغرفة من القائمة أعلاه
   - subject: موضوع القرار (الكلمات المفتاحية في العنوان)
   - principle: المبدأ القانوني (القاعدة المستخلصة من القرار)
   - summary: ملخص مختصر للقرار (جملة واحدة)
   - fullText: النص الكامل مرتباً بهذا التنسيق:
     ## الموضوع
     [موضوع القرار]
     
     ### المبدأ القانوني
     [المبدأ القانوني]
     
     ### حيثيات
     [حيثيات القرار إن وجدت]
     
     ### المرجع القانوني
     - [المواد القانونية المرتبطة]
     
     ---
     *المصدر: ملف PDF*
   - relatedArticles: قائمة بالمواد القانونية المذكورة
   - keywords: كلمات مفتاحية

3. إذا كان النص يحتوي على عدة قرارات، أعد كل قرار ككائن منفصل
4. إذا لم تتمكن من تحديد غرفة معينة، استخدم chamberId المناسب حسب الموضوع
5. إذا لم يكن هناك رقم قرار، استخدم "unknown" + التاريخ

## تنسيق الإخراج المطلوب:
أعد مصفوفة JSON فقط بدون أي نص إضافي. مثال:

[
  {
    "number": "327227",
    "date": "30/06/2004",
    "chamber": "الغرفة المدنية",
    "chamberId": "civil",
    "subject": "قضاء استعجالي – دعوى استعجالية",
    "principle": "طرح القضية أمام قاضي الموضوع ليس شرطا لاختصاص قاضي الأمور المستعجلة.",
    "summary": "طرح القضية أمام قاضي الموضوع، ليس شرطا لاختصاص قاضي الأمور المستعجلة.",
    "fullText": "## الموضوع\\n\\nقضاء استعجالي...\\n\\n### المبدأ القانوني\\n...",
    "relatedArticles": ["المادة 42 من قانون الإجراءات المدنية"],
    "keywords": ["قضاء استعجالي", "دعوى استعجالية", "اختصاص قضائي"]
  }
]

مهم: أعد مصفوفة JSON صحيحة فقط، بدون أي نص قبلها أو بعدها.`;

async function analyzeWithGemini(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
  
  const body = {
    system_instruction: {
      parts: [{ text: ANALYSIS_PROMPT }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: `حلل النص التالي واستخرج القرارات القضائية:\n\n${text}` }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topK: 20,
      topP: 0.9,
      maxOutputTokens: 32000,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`API Error ${response.status}: ${err?.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!responseText) {
    throw new Error('لم يتم إرجاع نص من API');
  }
  
  return responseText;
}

async function analyzeWithOpenRouter(text) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  const body = {
    model: 'google/gemini-2.5-flash',
    messages: [
      { role: 'system', content: ANALYSIS_PROMPT },
      { role: 'user', content: `حلل النص التالي واستخرج القرارات القضائية:\n\n${text}` }
    ],
    temperature: 0.2,
    max_tokens: 32000,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API Error ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content;
}

function parseJsonFromResponse(text) {
  // محاولة استخراج JSON من النص
  // أحياناً AI يضيف نصاً إضافياً حول JSON
  
  // 1. محاولة مباشرة
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    // تابع
  }
  
  // 2. البحث عن مصفوفة JSON
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // تابع
    }
  }
  
  // 3. تنظيف وتحديد مراجع ماركداون
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // تابع
  }
  
  const jsonMatch2 = cleaned.match(/\[[\s\S]*\]/);
  if (jsonMatch2) {
    try {
      return JSON.parse(jsonMatch2[0]);
    } catch (e) {
      // فشل نهائي
    }
  }
  
  return null;
}

function splitLongText(text, maxChars = 25000) {
  // تقسيم النص الطويل إلى أجزاء
  if (text.length <= maxChars) {
    return [text];
  }
  
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).length > maxChars && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

async function processFile(mdFile, index, total) {
  const filePath = path.join(MD_DIR, mdFile);
  const text = fs.readFileSync(filePath, 'utf-8');
  
  // إزالة frontmatter
  const content = text.replace(/^---[\s\S]*?---\n*/, '').trim();
  
  if (content.length < 50) {
    console.log(`  ⚠️  ${mdFile}: نص قصير جداً (${content.length} حرف) — تخطي`);
    return { file: mdFile, decisions: [], status: 'skipped' };
  }
  
  const progress = `[${(index + 1).toString().padStart(3)}/${total}]`;
  process.stdout.write(`  ${progress} 🔍 ${mdFile} (${content.length.toLocaleString()} حرف) ... `);
  
  try {
    const chunks = splitLongText(content);
    let allDecisions = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      let responseText;
      if (process.env.OPENROUTER_API_KEY) {
        responseText = await analyzeWithOpenRouter(chunk);
      } else {
        responseText = await analyzeWithGemini(chunk);
      }
      
      const parsed = parseJsonFromResponse(responseText);
      
      if (Array.isArray(parsed)) {
        allDecisions = allDecisions.concat(parsed);
      } else if (parsed && typeof parsed === 'object') {
        allDecisions.push(parsed);
      }
      
      // تأخير بين الطلبات
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    // تعيين معرفات فريدة
    const baseName = mdFile.replace(/\.md$/i, '');
    allDecisions.forEach((d, idx) => {
      if (!d.id) {
        d.id = `${baseName}-${String(idx + 1).padStart(3, '0')}`;
      }
      // التأكد من وجود النص الكامل
      if (!d.fullText) {
        d.fullText = `## الموضوع\n\n${d.subject || ''}\n\n### المبدأ القانوني\n\n${d.principle || ''}\n\n---\n*المصدر: ملف PDF*`;
      }
    });
    
    // حفظ النتيجة
    const outputFile = path.join(PARSED_DIR, mdFile.replace(/\.md$/i, '.json'));
    fs.writeFileSync(outputFile, JSON.stringify(allDecisions, null, 2), 'utf-8');
    
    console.log(`✅ (${allDecisions.length} قرار)`);
    return { file: mdFile, decisions: allDecisions.length, status: 'success' };
    
  } catch (error) {
    console.log(`❌ ${error.message}`);
    return { file: mdFile, decisions: 0, status: 'failed', error: error.message };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  🤖 تحليل النصوص باستخدام الذكاء الاصطناعي');
  console.log('═══════════════════════════════════════════════════\n');
  
  if (!API_KEY) {
    console.log('❌ لم يتم العثور على مفتاح API');
    console.log('   ضع GEMINI_API_KEY أو OPENROUTER_API_KEY في ملف .env');
    console.log('   أو شغّل: GEMINI_API_KEY=your_key npm run parse');
    process.exit(1);
  }
  
  const mdFiles = fs.readdirSync(MD_DIR)
    .filter(f => f.toLowerCase().endsWith('.md'))
    .sort();
  
  if (mdFiles.length === 0) {
    console.log('⚠️  لا توجد ملفات MD في مجلد الإخراج');
    console.log('   شغّل أولاً: npm run extract');
    process.exit(0);
  }
  
  console.log(`📊 عدد ملفات MD: ${mdFiles.length}\n`);
  
  const results = [];
  let totalDecisions = 0;
  
  for (let i = 0; i < mdFiles.length; i++) {
    const result = await processFile(mdFiles[i], i, mdFiles.length);
    results.push(result);
    totalDecisions += result.decisions || 0;
    
    // تأخير بين الملفات (تجنب rate limiting)
    if (i < mdFiles.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  // حفظ تقرير التحليل
  const report = {
    analysisDate: new Date().toISOString(),
    totalFiles: mdFiles.length,
    totalDecisions,
    results
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'analysis-report.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  📊 ملخص التحليل');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  📄 ملفات تم تحليلها: ${mdFiles.length}`);
  console.log(`  ⚖️  إجمالي القرارات: ${totalDecisions}`);
  console.log(`  📁 مجلد الإخراج: ${PARSED_DIR}`);
  console.log('═══════════════════════════════════════════════════\n');
  
  if (totalDecisions > 0) {
    console.log('✅ الخطوة التالية: شغّل "npm run classify" لتصنيف القرارات حسب الغرف');
  }
}

main().catch(console.error);
