import { NextResponse } from 'next/server';
import { readIndex, writeIndex } from '@/lib/cloud-storage';

/**
 * API لمزامنة الفهرس مع Telegram
 * يتحقق من وجود الملفات ويحذف الملفات المفقودة من الفهرس
 * يُرجع قائمة الملفات الموجودة في القناة والملفات المحذوفة
 */

export async function POST() {
  try {
    const files = await readIndex();
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    
    if (!botToken) {
      return NextResponse.json(
        { success: false, error: 'TELEGRAM_BOT_TOKEN غير محدد' },
        { status: 500 }
      );
    }

    // إذا كان الفهرس فارغاً، نحاول جلب الملفات من القناة
    if (files.length === 0) {
      // محاولة جلب معلومات عن القناة
      let channelFiles: string[] = [];
      
      if (channelId) {
        try {
          // جلب آخر رسائل القناة
          const response = await fetch(
            `https://api.telegram.org/bot${botToken}/getChat?chat_id=${channelId}`
          );
          const data = await response.json();
          
          if (data.ok) {
            channelFiles = ['القناة متصلة - استخدم رفع الملفات لإضافة ملفات جديدة'];
          }
        } catch {
          channelFiles = ['تعذر الاتصال بالقناة'];
        }
      }
      
      return NextResponse.json({
        success: true,
        valid: 0,
        removed: 0,
        channelFiles,
        removedFiles: [],
        message: 'الفهرس فارغ'
      });
    }

    const validFiles = [];
    const removedFiles = [];
    const channelFileNames = [];

    // التحقق من كل ملف
    for (const file of files) {
      const fileId = file.originalFileId || file.telegramFileId;
      
      if (!fileId) {
        // ملف بدون معرف - نحذفه
        removedFiles.push(file.fileName);
        continue;
      }

      try {
        // محاولة الحصول على رابط الملف
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
        );
        const data = await response.json();

        if (data.ok) {
          validFiles.push(file);
          channelFileNames.push(file.fileName);
        } else {
          // الملف غير موجود في Telegram
          removedFiles.push(file.fileName);
          console.log(`File removed: ${file.fileName} (${file.id})`);
        }
      } catch (error) {
        // في حالة الخطأ، نبقي الملف (قد يكون خطأ مؤقت)
        console.error(`Error checking file ${file.id}:`, error);
        validFiles.push(file);
        channelFileNames.push(`${file.fileName} (لم يتم التحقق)`);
      }
    }

    // تحديث الفهرس
    if (removedFiles.length > 0) {
      await writeIndex(validFiles);
    }

    return NextResponse.json({
      success: true,
      valid: validFiles.length,
      removed: removedFiles.length,
      channelFiles: channelFileNames,
      removedFiles,
      message: `تمت المزامنة. ${validFiles.length} ملف موجود، ${removedFiles.length} ملف محذوف`
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في المزامنة' },
      { status: 500 }
    );
  }
}
