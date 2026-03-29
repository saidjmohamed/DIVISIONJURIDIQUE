import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "models/gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ error: "معامل البحث 'q' مطلوب" }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      // Fallback: بحث عادي بالاسم في Redis
      return await fallbackSearch(query);
    }

    // استخراج محتوى ملف PDF من تليجرام والبحث فيه بـ Gemini
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
      return await fallbackSearch(query);
    }

    const files: any[] = (await redis.get("shamil:library:files")) || [];

    // بحث أولي بالاسم
    const nameMatch = files.filter(f =>
      f.name.toLowerCase().includes(query.toLowerCase())
    );

    // إذاوجد ملفات PDF، نحاول قراءة محتواها بـ Gemini
    const pdfFiles = files.filter(f =>
      f.type === "application/pdf" && f.telegramFileId
    );

    let aiResults: any[] = [];

    if (pdfFiles.length > 0 && pdfFiles.length <= 3) {
      // نأخذ أول 3 ملفات PDF لفحصها بـ Gemini
      for (const file of pdfFiles.slice(0, 3)) {
        try {
          // جلب رابط التحميل من تليجرام
          const tgRes = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file.telegramFileId}`
          );
          const tgData = await tgRes.json();
          const filePath = tgData?.result?.file_path;
          if (!filePath) continue;

          const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
          const fileRes = await fetch(fileUrl);
          const buffer = await fileRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");

          // إرسال الملف لـ Gemini للبحث فيه
          const geminiRes = await fetch(GEMINI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                role: "user",
                parts: [{
                  text: `ابحث في هذا الملف PDF عن: "${query}". أجب بالعربية. إذا وجدت نتائج ذات صلة، أعطني: 1) اسم الملف 2) الأجزاء المتعلقة بالبحث 3) رقم الصفحات. إذا لم تجد شيئاً ذا صلة، قل "لا توجد نتائج".`
                }, {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: base64,
                  }
                }]
              }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
              },
            }),
          });

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && !text.includes("لا توجد نتائج")) {
              aiResults.push({
                file: file.name,
                fileId: file.id,
                snippet: text.substring(0, 300),
              });
            }
          }
        } catch (err) {
          console.error("[library/search] Gemini error for file:", file.name, err);
        }
      }
    }

    // دمج النتائج: Gemini أولاً ثم البحث بالاسم
    const nameResults = nameMatch.map(f => ({
      file: f.name,
      fileId: f.id,
      snippet: `تطابق في اسم الملف`,
    }));

    const allResults = [...aiResults, ...nameResults];

    // إزالة التكرار
    const seen = new Set();
    const unique = allResults.filter(r => {
      if (seen.has(r.fileId)) return false;
      seen.add(r.fileId);
      return true;
    });

    return NextResponse.json({
      success: true,
      query,
      results: unique,
      total: unique.length,
      searchType: aiResults.length > 0 ? "gemini+name" : "name",
    });
  } catch (error) {
    console.error("[library/search] Error:", error);
    return NextResponse.json({ error: "فشل في البحث" }, { status: 500 });
  }
}

// بحث عادي كبديل
async function fallbackSearch(query: string) {
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const files: any[] = (await redis.get("shamil:library:files")) || [];
  const keyword = query
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/أ|إ|آ/g, "ا")
    .replace(/ة/g, "ه")
    .toLowerCase();

  const results = files
    .filter(f => {
      const name = f.name
        .replace(/[\u064B-\u065F]/g, "")
        .replace(/أ|إ|آ/g, "ا")
        .replace(/ة/g, "ه")
        .toLowerCase();
      return name.includes(keyword);
    })
    .map(f => ({ file: f.name, fileId: f.id, snippet: "تطابق في اسم الملف" }));

  return NextResponse.json({
    success: true,
    query,
    results,
    total: results.length,
    searchType: "name",
  });
}
