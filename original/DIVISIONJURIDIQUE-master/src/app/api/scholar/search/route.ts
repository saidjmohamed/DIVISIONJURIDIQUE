import { NextRequest, NextResponse } from 'next/server';

const SEMANTIC_SCHOLAR_BASE = 'https://api.semanticscholar.org/graph/v1';
const FIELDS = 'title,abstract,authors,year,citationCount,url,openAccessPdf';

interface ScholarPaper {
  paperId: string;
  title: string;
  abstract?: string;
  authors?: Array<{ authorId: string; name: string }>;
  year?: number;
  citationCount?: number;
  url?: string;
  openAccessPdf?: { url: string } | null;
}

interface TransformedResult {
  id: string;
  title: string;
  abstract?: string;
  authors: string[];
  year?: number;
  citations: number;
  url?: string;
  pdfUrl?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 20);

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'يرجى تقديم مصطلح بحث صالح', success: false },
        { status: 400 }
      );
    }

    if (query.length > 200) {
      return NextResponse.json(
        { error: 'عبارة البحث طويلة جداً. الحد الأقصى 200 حرف', success: false },
        { status: 400 }
      );
    }

    const apiUrl = `${SEMANTIC_SCHOLAR_BASE}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${FIELDS}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'تم تجاوز حد الطلبات. يرجى المحاولة بعد بضع دقائق', success: false },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'حدث خطأ في الاتصال بخادم البحث الأكاديمي', success: false },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      return NextResponse.json({
        success: true,
        results: [],
        total: 0,
        message: 'لم يتم العثور على نتائج',
      });
    }

    // Transform results to Arabic-friendly format
    const results: TransformedResult[] = data.data.map((paper: ScholarPaper) => ({
      id: paper.paperId,
      title: paper.title || 'بدون عنوان',
      abstract: paper.abstract || undefined,
      authors: paper.authors?.map((a) => a.name).filter(Boolean) || [],
      year: paper.year || undefined,
      citations: paper.citationCount || 0,
      url: paper.url || undefined,
      pdfUrl: paper.openAccessPdf?.url || undefined,
    }));

    return NextResponse.json({
      success: true,
      results,
      total: data.total || results.length,
      offset: data.offset || 0,
      message: results.length > 0
        ? `تم العثور على ${results.length} ورقة بحثية`
        : 'لم يتم العثور على نتائج مطابقة',
    });

  } catch (error) {
    console.error('Semantic Scholar API error:', error);

    // Handle timeout errors
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى', success: false },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى', success: false },
      { status: 500 }
    );
  }
}
