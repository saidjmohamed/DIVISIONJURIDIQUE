/**
 * محرك البحث القانوني — RAG Search Engine
 * يبحث في 268 قانون جزائري مدمج في public/laws/
 *
 * - تحميل الفهرس + القوانين عند أول استدعاء (lazy + cached)
 * - بحث بالكلمات المفتاحية (TF-IDF مبسّط)
 * - بحث برقم المادة
 * - بحث بالموضوع
 */

import { promises as fs } from "fs";
import path from "path";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface LawArticle {
  articleNumber: string;
  text: string;
  lawName: string;
  lawFile: string;
  category?: string;
  book?: string;
  chapter?: string;
}

export interface SearchResult {
  articles: LawArticle[];
  query: string;
  totalFound: number;
}

interface LawIndex {
  file: string;
  name: string;
  description?: string;
}

interface RawArticle {
  number: string | number;
  text: string;
  book?: string;
  chapter?: string;
}

interface RawLaw {
  title?: string;
  officialName?: string;
  articles: RawArticle[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Cache
// ═══════════════════════════════════════════════════════════════════════════

let allArticles: LawArticle[] | null = null;
let loadPromise: Promise<LawArticle[]> | null = null;

const LAWS_DIR = path.join(process.cwd(), "public", "laws");

// ═══════════════════════════════════════════════════════════════════════════
// تحميل كل القوانين (مرة واحدة)
// ═══════════════════════════════════════════════════════════════════════════

async function loadAllLaws(): Promise<LawArticle[]> {
  if (allArticles) return allArticles;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const articles: LawArticle[] = [];
    const startTime = Date.now();

    try {
      // 1. Load index
      const indexPath = path.join(LAWS_DIR, "index.json");
      const indexRaw = await fs.readFile(indexPath, "utf-8");
      const index: LawIndex[] = JSON.parse(indexRaw);

      // 2. Load each law file from the index
      const loadedFiles = new Set<string>();

      for (const entry of index) {
        if (loadedFiles.has(entry.file)) continue;
        loadedFiles.add(entry.file);

        try {
          const filePath = path.join(LAWS_DIR, entry.file);
          const raw = await fs.readFile(filePath, "utf-8");
          const law: RawLaw = JSON.parse(raw);
          const lawName = law.title || law.officialName || entry.name;

          if (law.articles && Array.isArray(law.articles)) {
            for (const art of law.articles) {
              if (!art.text || typeof art.text !== "string") continue;
              articles.push({
                articleNumber: String(art.number || ""),
                text: art.text,
                lawName,
                lawFile: entry.file,
                book: art.book,
                chapter: art.chapter,
              });
            }
          }
        } catch {
          // Skip unreadable files silently
        }
      }

      // 3. Also load any .json files not in index
      try {
        const allFiles = await fs.readdir(LAWS_DIR);
        for (const file of allFiles) {
          if (file === "index.json" || !file.endsWith(".json") || loadedFiles.has(file)) continue;
          loadedFiles.add(file);

          try {
            const filePath = path.join(LAWS_DIR, file);
            const raw = await fs.readFile(filePath, "utf-8");
            const law: RawLaw = JSON.parse(raw);
            const lawName = law.title || law.officialName || file.replace(".json", "").replace(/_/g, " ");

            if (law.articles && Array.isArray(law.articles)) {
              for (const art of law.articles) {
                if (!art.text || typeof art.text !== "string") continue;
                articles.push({
                  articleNumber: String(art.number || ""),
                  text: art.text,
                  lawName,
                  lawFile: file,
                  book: art.book,
                  chapter: art.chapter,
                });
              }
            }
          } catch {
            // Skip
          }
        }
      } catch {
        // Directory read failed — we at least have indexed laws
      }

      console.log(`[Legal Search] تم تحميل ${articles.length} مادة من ${loadedFiles.size} قانون في ${Date.now() - startTime}ms`);
    } catch (err) {
      console.error("[Legal Search] خطأ في تحميل القوانين:", err);
    }

    allArticles = articles;
    return articles;
  })();

  return loadPromise;
}

// ═══════════════════════════════════════════════════════════════════════════
// تنظيف النص العربي
// ═══════════════════════════════════════════════════════════════════════════

function normalizeArabic(text: string): string {
  return text
    .replace(/[إأآٱ]/g, "ا")
    .replace(/[ة]/g, "ه")
    .replace(/[ى]/g, "ي")
    .replace(/[ؤ]/g, "و")
    .replace(/[ئ]/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove tashkeel
    .replace(/\s+/g, " ")
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// استخراج الكلمات المفتاحية من سؤال المستخدم
// ═══════════════════════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
  "في", "من", "على", "إلى", "عن", "مع", "أن", "هل", "ما", "هو", "هي",
  "أو", "و", "لا", "لم", "لن", "قد", "كان", "يكون", "إذا", "هذا", "هذه",
  "ذلك", "تلك", "التي", "الذي", "الذين", "اللتين", "اللذين", "هؤلاء",
  "كل", "بعض", "أي", "كيف", "متى", "أين", "لماذا", "بين", "حتى", "ثم",
  "إن", "لكن", "بل", "مثل", "غير", "عند", "حول", "ضد", "بعد", "قبل",
  "فوق", "تحت", "دون", "خلال", "منذ", "نحو", "أنه", "أنها", "الا",
  "يا", "يرجى", "شرح", "أريد", "أعرف", "سؤال", "ممكن", "الرجاء",
]);

export function extractKeywords(query: string): string[] {
  const normalized = normalizeArabic(query);
  const words = normalized.split(/\s+/);
  const keywords: string[] = [];

  for (const word of words) {
    const clean = word.replace(/[^\u0600-\u06FF\u0750-\u077F0-9]/g, "");
    if (clean.length < 2) continue;
    if (STOP_WORDS.has(clean)) continue;
    keywords.push(clean);
  }

  return keywords;
}

// ═══════════════════════════════════════════════════════════════════════════
// البحث الرئيسي
// ═══════════════════════════════════════════════════════════════════════════

export async function searchLaws(query: string, limit = 10): Promise<SearchResult> {
  const articles = await loadAllLaws();
  const normalizedQuery = normalizeArabic(query);

  // 1. Check for article number search: "المادة 15" or "م.15" or "م 15"
  const articleNumberMatch = normalizedQuery.match(/(?:الماده|المادة|ماده|م\.?)\s*(\d+)/);

  // 2. Extract keywords
  const keywords = extractKeywords(query);

  if (keywords.length === 0 && !articleNumberMatch) {
    return { articles: [], query, totalFound: 0 };
  }

  // Score each article
  const scored: Array<{ article: LawArticle; score: number }> = [];

  for (const article of articles) {
    let score = 0;
    const normalizedText = normalizeArabic(article.text);
    const normalizedLawName = normalizeArabic(article.lawName);

    // Article number match (high priority)
    if (articleNumberMatch) {
      const targetNum = articleNumberMatch[1];
      if (article.articleNumber === targetNum) {
        score += 50;
      }
    }

    // Keyword matching with TF-IDF-like scoring
    for (const keyword of keywords) {
      // Exact word match in text
      const regex = new RegExp(keyword, "g");
      const textMatches = normalizedText.match(regex);
      if (textMatches) {
        // More matches = slightly higher score, but diminishing returns
        score += 10 + Math.min(textMatches.length * 2, 10);
      }

      // Match in law name (boost relevance)
      if (normalizedLawName.includes(keyword)) {
        score += 5;
      }

      // Match in book/chapter titles
      if (article.book && normalizeArabic(article.book).includes(keyword)) {
        score += 3;
      }
      if (article.chapter && normalizeArabic(article.chapter).includes(keyword)) {
        score += 3;
      }
    }

    // Bonus: if all keywords match the text (full phrase relevance)
    if (keywords.length > 1) {
      const allMatch = keywords.every(kw => normalizedText.includes(kw));
      if (allMatch) {
        score += 15;
      }
    }

    // Bonus: exact phrase match
    if (keywords.length > 1) {
      const phrase = keywords.join(" ");
      if (normalizedText.includes(phrase)) {
        score += 20;
      }
    }

    if (score > 0) {
      scored.push({ article, score });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top results
  const topResults = scored.slice(0, limit).map(s => s.article);

  console.log(`[Legal Search] "${query}" → ${scored.length} نتيجة، أعلى ${topResults.length}`);

  return {
    articles: topResults,
    query,
    totalFound: scored.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// تنسيق النتائج للحقن في الـ prompt
// ═══════════════════════════════════════════════════════════════════════════

export function formatSearchResultsForPrompt(results: SearchResult): string {
  if (results.articles.length === 0) {
    return "لا توجد نصوص قانونية مطابقة لهذا السؤال.";
  }

  const MAX_ARTICLE_TEXT = 500; // حرف كحد أقصى لكل مادة
  const lines: string[] = [];
  for (const art of results.articles) {
    const truncatedText = art.text.length > MAX_ARTICLE_TEXT
      ? art.text.slice(0, MAX_ARTICLE_TEXT) + "..."
      : art.text;
    lines.push(
      `📌 المادة ${art.articleNumber} — ${art.lawName}` +
      (art.book ? ` [${art.book}]` : "") +
      (art.chapter ? ` [${art.chapter}]` : "") +
      `\n${truncatedText}\n`
    );
  }

  return lines.join("\n---\n\n");
}
