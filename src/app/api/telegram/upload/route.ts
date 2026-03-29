import { NextRequest, NextResponse } from 'next/server';

/**
 * API لرفع الملفات إلى Telegram
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'لم يتم تقديم ملف' },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID; // @elshamill

    if (!botToken || !channelId) {
      return NextResponse.json(
        { success: false, error: 'إعدادات Telegram غير مكتملة' },
        { status: 500 }
      );
    }

    // تحويل الملف إلى ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // إنشاء FormData للإرسال إلى Telegram
    const telegramFormData = new FormData();
    telegramFormData.append('chat_id', channelId);
    telegramFormData.append('document', new Blob([buffer], { type: file.type }), file.name);

    // إرسال الملف إلى Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendDocument`,
      {
        method: 'POST',
        body: telegramFormData
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram upload error:', data);
      return NextResponse.json(
        { success: false, error: data.description || 'فشل في رفع الملف إلى Telegram' },
        { status: 500 }
      );
    }

    const document = data.result.document;
    const messageId = data.result.message_id;

    return NextResponse.json({
      success: true,
      fileId: document.file_id,
      messageId: messageId,
      fileName: document.file_name,
      fileSize: document.file_size
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء الرفع' },
      { status: 500 }
    );
  }
}
