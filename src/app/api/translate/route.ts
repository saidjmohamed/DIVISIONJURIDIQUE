import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory translation cache.
 * Key format: `${from}|${to}|${text}`
 * Limits cache size to avoid memory leaks.
 */
const MAX_CACHE_SIZE = 500;
const translationCache = new Map<string, string>();

function getCacheKey(text: string, from: string, to: string): string {
  return `${from}|${to}|${text}`;
}

/**
 * Translation API route using MyMemory free translation API.
 * Accepts: { text: string, from: 'ar'|'fr'|'en', to: 'ar'|'fr'|'en' }
 * Returns: { success: true, translatedText: string, from: string, to: string }
 *
 * Free tier: 5000 chars/day without API key, 35000 with free key.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, from, to } = body;

    // Validate inputs
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'يرجى تقديم النص المراد ترجمته.' },
        { status: 400 }
      );
    }

    const validLangs = ['ar', 'fr', 'en'];
    if (!from || !validLangs.includes(from)) {
      return NextResponse.json(
        { success: false, error: 'لغة المصدر غير مدعومة. اللغات المدعومة: ar, fr, en.' },
        { status: 400 }
      );
    }

    if (!to || !validLangs.includes(to)) {
      return NextResponse.json(
        { success: false, error: 'لغة الهدف غير مدعومة. اللغات المدعومة: ar, fr, en.' },
        { status: 400 }
      );
    }

    if (from === to) {
      return NextResponse.json({
        success: true,
        translatedText: text,
        from,
        to,
      });
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'النص طويل جداً. الحد الأقصى 5000 حرف للترجمة الواحدة.' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = getCacheKey(text, from, to);
    const cachedResult = translationCache.get(cacheKey);
    if (cachedResult) {
      return NextResponse.json({
        success: true,
        translatedText: cachedResult,
        from,
        to,
        cached: true,
      });
    }

    // Call MyMemory Translation API
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('MyMemory API error:', response.status);
      return NextResponse.json(
        { success: false, error: 'خدمة الترجمة غير متاحة حالياً. يرجى المحاولة مرة أخرى لاحقاً.' },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Check response status
    if (data.responseStatus === 403) {
      return NextResponse.json(
        { success: false, error: 'تم تجاوز الحد اليومي للترجمات المجانية. يرجى المحاولة غداً.' },
        { status: 429 }
      );
    }

    if (data.responseStatus !== 200 || !data.responseData) {
      console.error('MyMemory unexpected response:', data);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ في خدمة الترجمة. يرجى المحاولة مرة أخرى.' },
        { status: 500 }
      );
    }

    const translatedText = data.responseData.translatedText;

    if (!translatedText) {
      return NextResponse.json(
        { success: false, error: 'لم يتم الحصول على نتيجة الترجمة. يرجى المحاولة بنص مختلف.' },
        { status: 400 }
      );
    }

    // Cache the result (evict oldest entries if cache is full)
    if (translationCache.size >= MAX_CACHE_SIZE) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, translatedText);

    return NextResponse.json({
      success: true,
      translatedText,
      from,
      to,
      match: data.responseData.match || null,
    });

  } catch (error) {
    console.error('Translation API error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'تنسيق الطلب غير صالح. يرجى إرسال JSON صحيح.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.' },
      { status: 500 }
    );
  }
}
