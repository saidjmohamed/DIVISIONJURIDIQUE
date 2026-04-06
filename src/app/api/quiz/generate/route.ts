/**
 * /api/quiz/generate
 * يولّد أسئلة كويز قانونية بالذكاء الاصطناعي مع التعليل بنص قانوني
 *
 * الإصلاحات:
 * 1. maxDuration → 55 (ضمن حد Vercel الفعلي)
 * 2. geminiOnly: true لتخطي OpenRouter الذي يُضيف <think>...</think>
 * 3. تنظيف الرد من علامات التفكير قبل parseJSON
 * 4. fallback ثابت: قائمة أسئلة مدمجة عند فشل الذكاء الاصطناعي
 */

import { NextRequest, NextResponse } from 'next/server';
import { callAI, parseJSON, checkRateLimit } from '@/lib/ai-core';

export const maxDuration = 55;

// قائمة القوانين المتاحة
const LAW_REGISTRY: Record<string, { name: string; shortName: string; number: string }> = {
  qij:        { name: 'قانون الإجراءات الجزائية',           shortName: 'ق.إ.ج',   number: '25-14' },
  qima:       { name: 'قانون الإجراءات المدنية والإدارية',  shortName: 'ق.إ.م.إ', number: '08-09' },
  civil:      { name: 'القانون المدني',                     shortName: 'ق.م',     number: '75-58' },
  penal:      { name: 'قانون العقوبات',                     shortName: 'ق.ع',     number: '66-156' },
  commercial: { name: 'القانون التجاري',                    shortName: 'ق.ت',     number: '75-59' },
  family:     { name: 'قانون الأسرة',                      shortName: 'ق.أ',     number: '84-11' },
  maritime:   { name: 'القانون البحري',                     shortName: 'ق.ب',     number: '76-80' },
  mixed:      { name: 'مختلط (كل القوانين)',                shortName: 'مختلط',   number: '' },
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy:   'سهل',
  medium: 'متوسط',
  hard:   'صعب',
};

// ── أسئلة احتياطية تُعاد عند فشل الذكاء الاصطناعي ─────────────────────────
const FALLBACK_QUESTIONS = [
  {
    id: 'f1', law: 'ق.إ.ج', lawNumber: '25-14',
    question: 'ما هو أجل الطعن بالنقض في المواد الجزائية؟',
    options: ['5 أيام', '8 أيام', '10 أيام', '30 يوماً'],
    correct: 1,
    article: 'م.495', articleText: 'يرفع الطعن بالنقض خلال ثمانية أيام من تاريخ النطق بالقرار.',
    explanation: 'أجل الطعن بالنقض في المواد الجزائية هو 8 أيام وفق المادة 495 ق.إ.ج رقم 25-14.',
    difficulty: 'easy', category: 'الطعون',
  },
  {
    id: 'f2', law: 'ق.إ.م.إ', lawNumber: '08-09',
    question: 'ما هو أجل الاستئناف في المواد المدنية؟',
    options: ['15 يوماً', '30 يوماً', '1 شهر', '2 شهر'],
    correct: 1,
    article: 'م.334', articleText: 'ميعاد الاستئناف ثلاثون يوماً من تاريخ التبليغ الرسمي.',
    explanation: 'أجل الاستئناف في المواد المدنية هو 30 يوماً من تاريخ التبليغ وفق المادة 334 ق.إ.م.إ.',
    difficulty: 'easy', category: 'الطعون',
  },
  {
    id: 'f3', law: 'ق.م', lawNumber: '75-58',
    question: 'ما هي المدة العامة للتقادم في القانون المدني الجزائري؟',
    options: ['5 سنوات', '10 سنوات', '15 سنوات', '20 سنة'],
    correct: 2,
    article: 'م.308', articleText: 'يتقادم الالتزام بانقضاء خمس عشرة سنة.',
    explanation: 'التقادم العام في القانون المدني هو 15 سنة وفق المادة 308 ق.م رقم 75-58.',
    difficulty: 'medium', category: 'الالتزامات',
  },
  {
    id: 'f4', law: 'ق.إ.ج', lawNumber: '25-14',
    question: 'ما هي مدة التوقيف للنظر في المواد الجنائية؟',
    options: ['24 ساعة', '48 ساعة', '72 ساعة', '96 ساعة'],
    correct: 1,
    article: 'م.65', articleText: 'لا يجوز أن تتجاوز مدة التوقيف للنظر ثماني وأربعين ساعة.',
    explanation: 'مدة التوقيف للنظر 48 ساعة قابلة للتمديد وفق م.65 ق.إ.ج رقم 25-14.',
    difficulty: 'easy', category: 'التحقيق',
  },
  {
    id: 'f5', law: 'ق.إ.م.إ', lawNumber: '08-09',
    question: 'في أي حالة يكون الحكم غيابياً في المواد المدنية؟',
    options: [
      'عند غياب المدعي',
      'عند غياب المدعى عليه غير المبلَّغ',
      'عند غياب المدعى عليه المبلَّغ شخصياً',
      'عند غياب كلا الطرفين',
    ],
    correct: 1,
    article: 'م.281', articleText: 'يُعدّ الحكم غيابياً إذا لم يُبلَّغ الخصم تبليغاً صحيحاً.',
    explanation: 'الحكم غيابي عند غياب المدعى عليه الذي لم يُبلَّغ شخصياً وفق م.281 ق.إ.م.إ.',
    difficulty: 'medium', category: 'الأحكام',
  },
];

// ── تنظيف رد النموذج من علامات التفكير ─────────────────────────────────────
function cleanModelResponse(raw: string): string {
  // إزالة <think>...</think> التي تضيفها نماذج Qwen و DeepSeek
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 طلبات/دقيقة لكل IP
  const rl = await checkRateLimit(req, { key: 'quiz-generate', limit: 10, window: 60 });
  if (rl.limited) {
    return NextResponse.json({ error: rl.errorMessage }, { status: 429 });
  }

  let body: {
    lawId?: string;
    count?: number;
    difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
    category?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  const lawId      = body.lawId      || 'mixed';
  const count      = Math.min(Math.max(body.count || 5, 3), 10);
  const difficulty = body.difficulty || 'mixed';
  const law        = LAW_REGISTRY[lawId] || LAW_REGISTRY['mixed'];

  // ── بناء السياق القانوني ────────────────────────────────────────────────
  const lawContext = lawId === 'mixed'
    ? `القوانين الجزائرية: ق.إ.ج (25-14)، ق.إ.م.إ (08-09)، ق.م (75-58)، ق.ع (66-156)، ق.ت (75-59)، ق.أ (84-11)، ق.ب (76-80)`
    : `${law.name} رقم ${law.number} (${law.shortName})`;

  const difficultyHint = difficulty === 'mixed'
    ? 'وزّع الأسئلة بين سهل ومتوسط وصعب'
    : `جميع الأسئلة من مستوى: ${DIFFICULTY_LABELS[difficulty] || difficulty}`;

  const systemPrompt = `أنت خبير في القانون الجزائري. أجب بـ JSON صالح فقط بدون أي نص قبله أو بعده ولا markdown ولا تفكير.`;

  const userMessage = `أنشئ ${count} سؤال كويز حول: ${lawContext}. ${difficultyHint}.

JSON فقط — لا شيء آخر:
{"questions":[{"id":"q1","law":"ق.إ.ج","lawNumber":"25-14","question":"...","options":["أ","ب","ج","د"],"correct":0,"article":"م.1","articleText":"نص المادة","explanation":"التعليل مع رقم المادة","difficulty":"easy","category":"الاختصاص"}]}`;

  const result = await callAI({
    systemPrompt,
    userMessage,
    maxTokens: 4000,
    temperature: 0.5,
    requestType: 'json_extraction',
    // تخطي OpenRouter لأن Qwen يُضيف <think> قبل JSON فيُفشل التحليل
    geminiOnly: true,
  });

  // ── محاولة تحليل الرد ───────────────────────────────────────────────────
  if (result.content) {
    const cleaned = cleanModelResponse(result.content);
    const parsed  = parseJSON<{ questions: unknown[] }>(cleaned);

    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return NextResponse.json({
        questions: parsed.questions,
        meta: {
          model:     result.model.label,
          law:       law.name,
          count:     parsed.questions.length,
          elapsedMs: result.elapsedMs,
          source:    'ai',
        },
      });
    }
  }

  // ── Fallback: أسئلة مدمجة عند فشل الذكاء الاصطناعي ─────────────────────
  console.warn('[quiz/generate] جميع النماذج فشلت — استخدام الأسئلة الاحتياطية');

  // اختر أسئلة ذات صلة بالقانون المطلوب
  let fallback = FALLBACK_QUESTIONS;
  if (lawId !== 'mixed') {
    const shortName = law.shortName;
    const filtered  = FALLBACK_QUESTIONS.filter(q => q.law === shortName);
    if (filtered.length > 0) fallback = filtered;
  }

  // احتياطي: إعادة أسئلة عشوائية حتى العدد المطلوب
  const shuffled = [...fallback].sort(() => Math.random() - 0.5).slice(0, count);

  return NextResponse.json({
    questions: shuffled,
    meta: {
      model:     'fallback',
      law:       law.name,
      count:     shuffled.length,
      elapsedMs: 0,
      source:    'fallback',
      warning:   'تعذّر الاتصال بالذكاء الاصطناعي — عرض أسئلة احتياطية',
    },
  });
}
