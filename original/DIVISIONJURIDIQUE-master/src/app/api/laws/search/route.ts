import { NextResponse } from 'next/server';

/**
 * API للبحث في القوانين
 * يبحث في جميع المواد القانونية أو في قانون محدد
 */

interface SearchResult {
  lawFile: string;
  lawName: string;
  lawIcon: string;
  lawColor: string;
  article: {
    number: string;
    text: string;
    book?: string;
    chapter?: string;
    isAmended?: boolean;
    isNew?: boolean;
  };
  matches: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const lawFile = searchParams.get('law'); // قانون محدد أو 'all'

  if (!query || query.length < 2) {
    return NextResponse.json({ 
      success: false, 
      error: 'يجب إدخال حرفين على الأقل للبحث' 
    }, { status: 400 });
  }

  try {
    // جلب فهرس القوانين
    const indexResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/laws/index.json`);
    const lawsIndex = await indexResponse.json();

    const results: SearchResult[] = [];
    const searchTerms = query.toLowerCase().split(/\s+/);

    // تحديد القوانين للبحث فيها
    const lawsToSearch = lawFile && lawFile !== 'all' 
      ? lawsIndex.filter((l: any) => l.file === lawFile)
      : lawsIndex;

    for (const law of lawsToSearch) {
      try {
        const lawResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/laws/${law.file}`);
        const lawData = await lawResponse.json();

        if (!lawData.articles) continue;

        for (const article of lawData.articles) {
          const text = article.text.toLowerCase();
          const number = article.number.toLowerCase();

          // حساب عدد التطابقات
          let matches = 0;
          for (const term of searchTerms) {
            const regex = new RegExp(term, 'gi');
            const textMatches = (text.match(regex) || []).length;
            const numberMatches = (number.match(regex) || []).length;
            matches += textMatches + numberMatches;
          }

          if (matches > 0) {
            results.push({
              lawFile: law.file,
              lawName: law.name,
              lawIcon: law.icon,
              lawColor: law.color,
              article: {
                number: article.number,
                text: article.text,
                book: article.book,
                chapter: article.chapter,
                isAmended: article.isAmended,
                isNew: article.isNew
              },
              matches
            });
          }
        }
      } catch (e) {
        console.error(`Error loading law ${law.file}:`, e);
      }
    }

    // ترتيب النتائج حسب عدد التطابقات
    results.sort((a, b) => b.matches - a.matches);

    // تحديد عدد النتائج
    const limit = parseInt(searchParams.get('limit') || '50');
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({
      success: true,
      query,
      total: results.length,
      results: limitedResults
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في البحث' },
      { status: 500 }
    );
  }
}
