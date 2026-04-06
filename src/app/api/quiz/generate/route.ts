/**
 * /api/quiz/generate
 * يولّد أسئلة كويز قانونية بالذكاء الاصطناعي مع التعليل بنص قانوني
 * يعتمد على ai-core.ts (Qwen → Gemini 2.5 → Gemini 2.0 → Groq)
 */

import { NextRequest, NextResponse } from 'next/server';
import { callAI, parseJSON, checkRateLimit } from '@/lib/ai-core';

export const maxDuration = 60;

// قائمة القوانين المتاحة مع وصفها
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

  // ── بناء السياق القانوني ──────────────────────────────────────────
  const lawContext = lawId === 'mixed'
    ? `القوانين الجزائرية: ق.إ.ج (25-14)، ق.إ.م.إ (08-09)، ق.م (75-58)، ق.ع (66-156)، ق.ت (75-59)، ق.أ (84-11)، ق.ب (76-80)`
    : `${law.name} رقم ${law.number} (${law.shortName})`;

  const difficultyHint = difficulty === 'mixed'
    ? 'وزّع الأسئلة بين سهل ومتوسط وصعب'
    : `جميع الأسئلة من مستوى: ${DIFFICULTY_LABELS[difficulty] || difficulty}`;

  const systemPrompt = `أنت خبير في القانون الجزائري. أجب بـ JSON صالح فقط، بدون أي نص قبله أو بعده، بدون markdown.`;

  const userMessage = `أنشئ ${count} سؤال كويز حول: ${lawContext}. ${difficultyHint}.

JSON فقط:
{"questions":[{"id":"q1","law":"ق.إ.ج","lawNumber":"25-14","question":"...","options":["أ","ب","ج","د"],"correct":0,"article":"م.1","articleText":"نص المادة","explanation":"التعليل مع رقم المادة","difficulty":"easy","category":"الاختصاص"}]}`;

  const result = await callAI({
    systemPrompt,
    userMessage,
    maxTokens: 4000,
    temperature: 0.6,
    requestType: 'json_extraction',
  });

  if (!result.content) {
    return NextResponse.json({ error: 'فشل توليد الأسئلة، حاول مرة أخرى' }, { status: 503 });
  }

  const parsed = parseJSON<{ questions: unknown[] }>(result.content);
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return NextResponse.json({ error: 'تعذّر تحليل رد النموذج، حاول مرة أخرى' }, { status: 503 });
  }

  return NextResponse.json({
    questions: parsed.questions,
    meta: {
      model:     result.model.label,
      law:       law.name,
      count:     parsed.questions.length,
      elapsedMs: result.elapsedMs,
    },
  });
}
