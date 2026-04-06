#!/usr/bin/env node

/**
 * export-laws-json.mjs
 *
 * Reads all .json law files from /public/laws/ (except index.json),
 * converts each to a compact [{num, text}] format, saves to /public/laws-json/,
 * and generates a combined all.json + index.json mapping file.
 *
 * Usage:  node scripts/export-laws-json.mjs
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const LAWS_DIR = resolve(ROOT, "public", "laws");
const OUTPUT_DIR = resolve(ROOT, "public", "laws-json");

// ── ID mapping for the core laws ─────────────────────────────────────────────
const ID_MAP = {
  "قانون_الاجراءات_الجزائية.json": "qij",
  "قانون_الاجراءات_المدنية_والادارية.json": "qima",
  "قانون_العقوبات.json": "penal",
  "القانون_المدني.json": "civil",
  "القانون_التجاري.json": "commercial",
  "القانون_البحري.json": "maritime",
  "قانون_الاسرة.json": "family",
  "قانون_الاجراءات_الجبائية.json": "fiscal",
  "دستور_الجمهورية_الديمقراطية_الشعبية_الجزائرية.json": "constitution",
};

// ── Helper: derive a short ID from a filename (fallback) ─────────────────────
function deriveId(filename) {
  const stem = filename.replace(/\.json$/i, "").replace(/\s+/g, "_");
  return stem;
}

// ── Helper: get the output filename ──────────────────────────────────────────
function getOutputId(filename) {
  return ID_MAP[filename] || deriveId(filename);
}

// ── Ensure output directory exists ───────────────────────────────────────────
mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Read the existing index.json for metadata enrichment ─────────────────────
let existingIndex = [];
try {
  const raw = readFileSync(resolve(LAWS_DIR, "index.json"), "utf-8");
  existingIndex = JSON.parse(raw);
} catch {
  console.log("⚠  No existing index.json found — will build index from scratch.");
}

// Build a lookup: source filename → metadata entry
const metaLookup = new Map();
for (const entry of existingIndex) {
  if (entry.file) metaLookup.set(entry.file, entry);
}

// ── Read all .json files (skip index.json) ───────────────────────────────────
const allFiles = readdirSync(LAWS_DIR)
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .sort();

let processedFiles = 0;
let skippedFiles = 0;
let totalArticles = 0;
const allCombined = [];     // merged array for all.json
const indexEntries = [];    // entries for the generated index.json

for (const filename of allFiles) {
  const filePath = resolve(LAWS_DIR, filename);

  let raw;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (err) {
    console.error(`❌ Cannot read ${filename}: ${err.message}`);
    skippedFiles++;
    continue;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Cannot parse ${filename}: ${err.message}`);
    skippedFiles++;
    continue;
  }

  // Extract articles
  if (!Array.isArray(data.articles) || data.articles.length === 0) {
    console.warn(`⚠  Skipping ${filename} — no articles array or it's empty.`);
    skippedFiles++;
    continue;
  }

  const id = getOutputId(filename);
  const outputFilename = `${id}.json`;

  // Convert articles to compact format [{num, text}]
  const compactArticles = data.articles.map((a, idx) => ({
    num: idx + 1,        // auto-incrementing numeric index for ordering
    number: a.number,    // original article number (string like "5 مكرر")
    text: a.text || "",
  }));

  // Write individual file
  const outputPath = resolve(OUTPUT_DIR, outputFilename);
  writeFileSync(outputPath, JSON.stringify(compactArticles, null, 2), "utf-8");

  // Add to combined array with law reference
  for (const article of compactArticles) {
    allCombined.push({
      law: id,
      num: article.num,
      number: article.number,
      text: article.text,
    });
  }

  const articleCount = compactArticles.length;
  totalArticles += articleCount;
  processedFiles++;

  // Build index entry — enrich with existing metadata when available
  const existing = metaLookup.get(filename) || {};
  indexEntries.push({
    id,
    name: existing.name || data.title || filename.replace(/\.json$/, ""),
    file: outputFilename,
    count: articleCount,
    number: existing.number || data.number || "",
    icon: existing.icon || "📄",
    color: existing.color || "#6b7280",
  });

  console.log(`✅ ${filename} → ${outputFilename} (${articleCount} articles)`);
}

// ── Write combined all.json ─────────────────────────────────────────────────
const allPath = resolve(OUTPUT_DIR, "all.json");
writeFileSync(allPath, JSON.stringify(allCombined, null, 2), "utf-8");
console.log(`\n✅ Combined all.json written (${allCombined.length} total articles)`);

// ── Sort index entries: mapped core laws first, then the rest ───────────────
const mappedIds = new Set(Object.values(ID_MAP));
indexEntries.sort((a, b) => {
  const aCore = mappedIds.has(a.id) ? 0 : 1;
  const bCore = mappedIds.has(b.id) ? 0 : 1;
  if (aCore !== bCore) return aCore - bCore;
  return a.id.localeCompare(b.id);
});

// ── Write index.json ─────────────────────────────────────────────────────────
const indexPath = resolve(OUTPUT_DIR, "index.json");
writeFileSync(indexPath, JSON.stringify(indexEntries, null, 2), "utf-8");
console.log(`✅ index.json written (${indexEntries.length} law entries)`);

// ── Summary ─────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════");
console.log(`  Files processed : ${processedFiles}`);
console.log(`  Files skipped   : ${skippedFiles}`);
console.log(`  Total articles  : ${totalArticles}`);
console.log(`  Output dir      : ${OUTPUT_DIR}`);
console.log("══════════════════════════════════════════════════");
