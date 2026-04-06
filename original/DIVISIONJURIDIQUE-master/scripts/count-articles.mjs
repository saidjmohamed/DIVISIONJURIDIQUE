// /scripts/count-articles.mjs
// شغّله مرة واحدة: node scripts/count-articles.mjs
// أو تلقائياً مع كل build: npm run build
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const LAWS_DIR = path.join(ROOT, "public", "laws")

// ── القوانين الأساسية السبعة ──
const CORE_LAWS = [
  {
    id: "qij",
    name: "قانون الإجراءات الجزائية",
    shortName: "ق.إ.ج",
    number: "25-14",
    year: 2025,
    icon: "⚖️",
    color: "#1a3a5c",
    file: "قانون_الاجراءات_الجزائية.json",
  },
  {
    id: "qima",
    name: "قانون الإجراءات المدنية والإدارية",
    shortName: "ق.إ.م.إ",
    number: "08-09",
    year: 2008,
    icon: "🏛️",
    color: "#7c3aed",
    file: "قانون_الاجراءات_المدنية_والادارية.json",
  },
  {
    id: "penal",
    name: "قانون العقوبات",
    shortName: "ق.ع",
    number: "66-156",
    year: 1966,
    icon: "🔨",
    color: "#dc2626",
    file: "قانون_العقوبات.json",
  },
  {
    id: "civil",
    name: "القانون المدني",
    shortName: "ق.م",
    number: "75-58",
    year: 1975,
    icon: "📜",
    color: "#059669",
    file: "القانون_المدني.json",
  },
  {
    id: "commercial",
    name: "القانون التجاري",
    shortName: "ق.ت",
    number: "75-59",
    year: 1975,
    icon: "💼",
    color: "#d97706",
    file: "القانون_التجاري.json",
  },
  {
    id: "maritime",
    name: "القانون البحري",
    shortName: "ق.ب",
    number: "76-80",
    year: 1976,
    icon: "⛵",
    color: "#0284c7",
    file: "القانون_البحري.json",
  },
  {
    id: "family",
    name: "قانون الأسرة",
    shortName: "ق.أ",
    number: "84-11",
    year: 1984,
    icon: "👨‍👩‍👧",
    color: "#e11d48",
    file: "قانون_الاسرة.json",
  },
]

// ── إحصاء ملف قانون واحد ──
function countLawArticles(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8")
  const data = JSON.parse(raw)
  const articles = data.articles || []

  // استخراج أرقام المواد الفريدة
  const numbers = new Set()
  for (const a of articles) {
    const n = parseInt(a.number, 10)
    if (!isNaN(n) && n > 0 && n < 10000) numbers.add(n)
  }

  const sorted = [...numbers].sort((a, b) => a - b)
  const maxArticle = sorted.at(-1) ?? 0
  const totalUnique = numbers.size

  // كشف الفجوات (مواد مفقودة)
  const gaps = []
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i] - sorted[i - 1]
    if (diff > 1 && diff <= 20) {
      gaps.push({ from: sorted[i - 1] + 1, to: sorted[i] - 1 })
    }
  }

  return {
    totalArticles: totalUnique,
    maxArticle,
    gaps: gaps.slice(0, 5),
    fileSizeKB: Math.round(fs.statSync(filePath).size / 1024),
  }
}

// ── إحصاء كل القوانين في المجلد (غير الأساسية) ──
function countAllLaws() {
  const allFiles = fs.readdirSync(LAWS_DIR).filter(f => f.endsWith(".json") && f !== "index.json")
  const coreSet = new Set(CORE_LAWS.map(l => l.file))
  const otherFiles = allFiles.filter(f => !coreSet.has(f))

  let otherTotal = 0
  let otherSizeKB = 0
  for (const f of otherFiles) {
    try {
      const fp = path.join(LAWS_DIR, f)
      const raw = fs.readFileSync(fp, "utf-8")
      const data = JSON.parse(raw)
      const arts = data.articles || []
      otherTotal += arts.length
      otherSizeKB += Math.round(fs.statSync(fp).size / 1024)
    } catch {
      // ملف تالف — تخطيه
    }
  }
  return { otherLawsCount: otherFiles.length, otherTotalArticles: otherTotal, otherSizeKB }
}

// ── الدالة الرئيسية ──
function main() {
  console.log("📊 جاري إحصاء القوانين...\n")

  const lawsStats = []
  let coreTotalArticles = 0
  let coreTotalSizeKB = 0

  for (const law of CORE_LAWS) {
    const filePath = path.join(LAWS_DIR, law.file)

    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠️  غير موجود: ${law.file}`)
      continue
    }

    const stats = countLawArticles(filePath)
    coreTotalArticles += stats.totalArticles
    coreTotalSizeKB += stats.fileSizeKB

    lawsStats.push({
      id: law.id,
      name: law.name,
      shortName: law.shortName,
      number: law.number,
      year: law.year,
      icon: law.icon,
      color: law.color,
      ...stats,
      lastUpdated: new Date().toISOString().split("T")[0],
    })

    console.log(
      `  ✅ ${law.icon} ${law.shortName} (${law.number}): ${stats.totalArticles} مادة | أعلى رقم: ${stats.maxArticle} | ${stats.fileSizeKB} KB`
    )
  }

  // إحصاء بقية القوانين
  const other = countAllLaws()
  const totalArticles = coreTotalArticles + other.otherTotalArticles
  const totalSizeKB = coreTotalSizeKB + other.otherSizeKB

  const output = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalLaws: CORE_LAWS.length + other.otherLawsCount,
      coreLaws: CORE_LAWS.length,
      otherLaws: other.otherLawsCount,
      coreArticles: coreTotalArticles,
      otherArticles: other.otherTotalArticles,
      totalArticles,
      totalSizeKB,
      totalSizeMB: (totalSizeKB / 1024).toFixed(2),
    },
    laws: lawsStats,
  }

  // ── حفظ النتيجة ──
  const outPath = path.join(ROOT, "src", "data", "laws-stats.json")
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8")

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`📚 القوانين الأساسية  : ${CORE_LAWS.length}`)
  console.log(`📂 قوانين أخرى       : ${other.otherLawsCount}`)
  console.log(`📖 إجمالي القوانين   : ${output.summary.totalLaws}`)
  console.log(`📝 مواد أساسية       : ${coreTotalArticles.toLocaleString("ar-DZ")}`)
  console.log(`📝 مواد أخرى         : ${other.otherTotalArticles.toLocaleString("ar-DZ")}`)
  console.log(`📊 إجمالي المواد     : ${totalArticles.toLocaleString("ar-DZ")}`)
  console.log(`💾 الحجم الإجمالي    : ${(totalSizeKB / 1024).toFixed(1)} MB`)
  console.log(`✅ حُفظ في: ${outPath}`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
}

main()
