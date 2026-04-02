/**
 * استخراج النص من ملفات PDF و DOCX في المتصفح (client-side)
 * لتجنب إرسال الملف كاملاً للسيرفر
 */

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.docx')) {
    return extractDocxText(file);
  }

  if (name.endsWith('.pdf')) {
    return extractPdfText(file);
  }

  throw new Error('صيغة الملف غير مدعومة. يرجى رفع ملف PDF أو DOCX.');
}

async function extractDocxText(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth/mammoth.browser');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (err) {
    throw new Error('فشل في قراءة ملف Word. تأكد أن الملف بصيغة DOCX صحيحة.');
  }
}

async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: { str?: string }) => item.str ?? '')
        .join(' ');
      pages.push(text);
    }

    return pages.join('\n\n');
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`فشل في قراءة ملف PDF: ${err.message}`);
    }
    throw new Error('فشل في قراءة ملف PDF. تأكد أن الملف بصيغة PDF صحيحة.');
  }
}
