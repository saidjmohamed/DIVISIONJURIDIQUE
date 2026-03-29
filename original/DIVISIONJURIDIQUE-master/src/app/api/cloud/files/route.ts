import { NextRequest, NextResponse } from 'next/server';
import { addFile, generateId, readIndex, removeFile } from '@/lib/cloud-storage';

// جلب الملفات
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'الكل';
    const search = searchParams.get('search') || '';

    let files = await readIndex();

    if (category && category !== 'الكل') {
      files = files.filter(f => f.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      files = files.filter(f =>
        f.fileName.toLowerCase().includes(searchLower) ||
        f.description?.toLowerCase().includes(searchLower)
      );
    }

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

// إضافة ملف جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const fileRecord = {
      id: generateId(),
      fileName: body.fileName,
      fileSize: body.fileSize || 0,
      category: body.category || 'أخرى',
      mimeType: body.mimeType || 'application/octet-stream',
      
      originalFileId: body.originalFileId,
      originalMessageId: body.originalMessageId,
      
      description: body.description || undefined,
      uploadedAt: new Date().toISOString(),
      
      contributor: body.contributor || undefined
    };

    const success = await addFile(fileRecord);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'الملف موجود بالفعل' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      file: fileRecord
    });

  } catch (error) {
    console.error('Error adding file:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في إضافة الملف' },
      { status: 500 }
    );
  }
}

// حذف ملف
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف الملف مطلوب' },
        { status: 400 }
      );
    }

    const success = await removeFile(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'الملف غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الملف من الفهرس'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في حذف الملف' },
      { status: 500 }
    );
  }
}
