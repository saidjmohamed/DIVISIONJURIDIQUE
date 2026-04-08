import { NextRequest, NextResponse } from "next/server";
import { searchLaws } from "@/lib/legal-search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 10, 20) : 10;

  if (!q) {
    return NextResponse.json({ error: "يرجى تحديد كلمة بحث (q)" }, { status: 400 });
  }

  if (q.length > 500) {
    return NextResponse.json({ error: "نص البحث طويل جداً" }, { status: 400 });
  }

  try {
    const results = await searchLaws(q, limit);
    return NextResponse.json(results);
  } catch (err) {
    console.error("[Legal Search API] Error:", err);
    return NextResponse.json({ error: "خطأ في البحث" }, { status: 500 });
  }
}
