#!/usr/bin/env node
/**
 * Prepare the existing 268-law JSON library as Markdown files for staged import.
 * Source: public/laws-json/index.json + each indexed JSON file.
 * Output: data/legal-markdown/*.md and data/legal-markdown/manifest.json
 * This script does not upload or delete anything.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'public', 'laws-json');
const OUTPUT = path.join(ROOT, 'data', 'legal-markdown');

const CATEGORY_RULES = [
  ['الجزائي', /عقوبات|جزائي|إجراءات جزائية|مخدرات|مؤثرات عقلية|جريمة|جرائم|نصب|احتيال|فساد|كراهية|تمييز/],
  ['القضاء والمحاكم', /قضاء|محكمة|مجلس الدولة|تنظيم قضائي|محضر قضائي|مهنة المحاماة|المحاماة/],
  ['المدني والتجاري', /مدني|تجاري|التزامات|عقود|تأمين|شركات|إفلاس|بنوك|مصرف|صفقات/],
  ['الضرائب والجمارك', /ضرائب|جبائي|جباية|جمرك|جمارك|رسوم|ضريبة/],
  ['الإداري والدستوري', /دستور|انتخاب|جماعات محلية|ولاية|بلدية|إداري|وظيفة عمومية|صفقات عمومية/],
  ['العمل والاجتماعي', /عمل|عمال|تشغيل|ضمان اجتماعي|تقاعد|منازعات اجتماعية|نقابي/],
  ['العقار والتعمير', /عقار|ملكية عقارية|سجل عقاري|مسح الأراضي|تعمير|بناء|تهيئة|إيجار|كراء|أملاك الدولة/],
  ['البيئة والفلاحة', /بيئة|فلاحة|غابات|صيد|مياه|حيوان|نبات|زراعة|حرائق الغابات/],
  ['الصحة والأسرة', /أسرة|عائلة|زواج|طلاق|حالة مدنية|طفل|صحة|طب|دواء|صيدلة/],
  ['النقل والمرور', /مرور|طرقات|نقل|مركبات|سيارات|طيران|بحري|موانئ/],
  ['الأمن والدفاع', /أمن|دفاع|جيش|شرطة|حماية مدنية|وقاية|حدود|درك|حالة الطوارئ/],
  ['الإعلام والاتصال', /إعلام|اتصال|صحافة|سمعي بصري|بريد|اتصالات إلكترونية|إنترنت/],
  ['الملكية الفكرية', /ملكية فكرية|مؤلف|حقوق المؤلف|براءة اختراع|علامة تجارية|مصنف|ملكية صناعية/],
  ['الاقتصاد والاستثمار', /استثمار|اقتصاد|مؤسسة|منافسة|تجارة خارجية|امتياز|عقار اقتصادي/],
];

function inferCategory(law) {
  if (law.category && CATEGORY_RULES.some(([name]) => name === law.category)) return law.category;
  const haystack = `${law.name || ''} ${law.fullName || ''} ${law.number || ''}`;
  return CATEGORY_RULES.find(([, pattern]) => pattern.test(haystack))?.[0] || 'أخرى';
}
function safeName(value) {
  return String(value).replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 100) || 'law';
}
function normalizeArticles(data) {
  const source = Array.isArray(data) ? data : Array.isArray(data?.articles) ? data.articles : [];
  return source
    .filter((a) => a && typeof a.text === 'string' && a.text.trim())
    .map((a, index) => ({
      article_order: Number.isFinite(Number(a.num)) ? Number(a.num) : index + 1,
      article_number: String(a.number ?? a.article_number ?? a.num ?? index + 1),
      article_title: a.title ? String(a.title) : '',
      article_text: String(a.text).trim(),
      book: a.book ? String(a.book) : '',
      chapter: a.chapter ? String(a.chapter) : '',
    }));
}
function toMarkdown(law, articles) {
  const lines = [`# ${law.title}`, ''];
  if (law.law_number) lines.push(`**رقم النص:** ${law.law_number}`, '');
  lines.push('---', '');
  for (const article of articles) {
    lines.push(`## المادة ${article.article_number}`, `<!-- article-order: ${article.article_order} -->`, '');
    if (article.book) lines.push(`**${article.book}**`, '');
    if (article.chapter) lines.push(`**${article.chapter}**`, '');
    if (article.article_title) lines.push(`### ${article.article_title}`, '');
    lines.push(article.article_text, '', '---', '');
  }
  return lines.join('\n');
}

await mkdir(OUTPUT, { recursive: true });
const index = JSON.parse(await readFile(path.join(SOURCE, 'index.json'), 'utf8'));
if (!Array.isArray(index)) throw new Error('index.json must be an array');

const manifest = [];
const failures = [];
for (const entry of index) {
  try {
    const raw = await readFile(path.join(SOURCE, entry.file), 'utf8');
    const data = JSON.parse(raw);
    const articles = normalizeArticles(data);
    if (!articles.length) throw new Error('No readable articles');
    const law = {
      id: String(entry.id),
      title: String(entry.name || data.title || entry.id),
      official_name: String(data.officialName || data.official_name || entry.name || ''),
      law_number: String(entry.number || data.number || ''),
      category_slug: inferCategory(entry),
      icon: String(entry.icon || '⚖️'),
      color: String(entry.color || '#2563eb'),
      source_file: entry.file,
      expected_count: Number(entry.count || 0),
      actual_count: articles.length,
      category_was_inferred: !entry.category,
    };
    const filename = `${safeName(law.id)}.md`;
    await writeFile(path.join(OUTPUT, filename), toMarkdown(law, articles), 'utf8');
    manifest.push({ ...law, markdown_file: filename });
    if (law.expected_count && law.expected_count !== law.actual_count) {
      failures.push({ id: law.id, issue: 'count_mismatch', expected: law.expected_count, actual: law.actual_count });
    }
  } catch (error) {
    failures.push({ id: entry.id, file: entry.file, issue: String(error?.message || error) });
  }
}
const report = {
  generated_at: new Date().toISOString(),
  source_law_count: index.length,
  prepared_law_count: manifest.length,
  inferred_categories: manifest.filter((x) => x.category_was_inferred).length,
  total_articles: manifest.reduce((sum, x) => sum + x.actual_count, 0),
  failures,
  laws: manifest,
};
await writeFile(path.join(OUTPUT, 'manifest.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({
  source_law_count: index.length,
  prepared_law_count: manifest.length,
  inferred_categories: report.inferred_categories,
  total_articles: report.total_articles,
  failures: failures.length,
  output: path.relative(ROOT, OUTPUT),
}, null, 2));
if (failures.length) process.exitCode = 1;
