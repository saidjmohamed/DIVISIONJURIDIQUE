import { NextRequest, NextResponse } from 'next/server';

/**
 * API لتنزيل الملفات من Telegram
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const redirect = searchParams.get('redirect') === 'true';

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'معرف الملف مطلوب' },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json(
        { success: false, error: 'TELEGRAM_BOT_TOKEN غير محدد' },
        { status: 500 }
      );
    }

    // الحصول على معلومات الملف
    const fileInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const fileInfo = await fileInfoResponse.json();

    if (!fileInfo.ok) {
      console.error('Telegram getFile error:', fileInfo);
      return NextResponse.json(
        { success: false, error: fileInfo.description || 'الملف غير موجود' },
        { status: 404 }
      );
    }

    const filePath = fileInfo.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    // إذا كان redirect=true، نعيد توجيه المستخدم مباشرة
    if (redirect) {
      return NextResponse.redirect(fileUrl);
    }

    // وإلا نجلب الملف ونرجعه
    const fileResponse = await fetch(fileUrl);
    const fileBuffer = await fileResponse.arrayBuffer();

    // استخراج اسم الملف من المسار
    const fileName = filePath.split('/').pop() || 'download';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': fileResponse.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء التنزيل' },
      { status: 500 }
    );
  }
}
