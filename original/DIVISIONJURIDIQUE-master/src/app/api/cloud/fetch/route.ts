import { NextRequest, NextResponse } from 'next/server';
import { readIndex } from '@/lib/cloud-storage';

/**
 * API لجلب الملفات من الفهرس
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'الكل';
    const search = searchParams.get('search') || '';

    let files = await readIndex();

    // تصفية حسب التصنيف
    if (category && category !== 'الكل') {
      files = files.filter(f => f.category === category);
    }

    // تصفية حسب البحث
    if (search) {
      const searchLower = search.toLowerCase();
      files = files.filter(f =>
        f.fileName.toLowerCase().includes(searchLower) ||
        f.description?.toLowerCase().includes(searchLower) ||
        f.contributor?.name?.toLowerCase().includes(searchLower) ||
        f.contributor?.profession?.toLowerCase().includes(searchLower)
      );
    }

    // للتوافق مع النسخ القديمة
    const formatted = files.map(f => ({
      ...f,
      telegramFileId: f.originalFileId || f.telegramFileId,
      telegramMessageId: f.originalMessageId || f.telegramMessageId
    }));

    return NextResponse.json({
      success: true,
      files: formatted,
      total: files.length
    });

  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب الملفات' },
      { status: 500 }
    );
  }
}
