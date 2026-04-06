/**
 * AI Core — محرك الذكاء الاصطناعي (v11 — Smart Fallback System)
 *
 * 🥇 المزود الأول:  OpenRouter → qwen/qwen3.6-plus:free
 * 🥈 Fallback 1:    Google Gemini 2.5 Flash  (أسرع — مدفوع)
 * 🥉 Fallback 2:    Google Gemini 2.0 Flash  (مجاني — 4 مفاتيح بالتناوب)
 * 🏅 Fallback 3:    Groq → llama-3.3-70b-versatile (مجاني — سريع جداً)
 *
 * الانتقال يحدث تلقائياً عند:
 *   - Rate limit (429) من أي مزود
 *   - خطأ في الخادم (5xx)
 *   - Timeout
 *   - رد فارغ
 *
 * Used by: /api/ai, /api/petition-check, /api/tools/contract, /api/tools/judgment, /api/tools/memo
 */

import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════
// 🔑 مفاتيح API
// ═══════════════════════════════════════════════════════════════════════════

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_KEY       = process.env.GROQ_API_KEY || "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";

// ── مفاتيح Gemini — تدوير تلقائي (كل مفتاح 1500 طلب/يوم مجاناً) ──
export const GEMINI_KEYS: string[] = [
  process.env.GEMINI_API_KEY_1 || "AIzaSyDLlsNaQFMrGgBlyFRdAQAjwDwYh_m4wiM", // key 1
  process.env.GEMINI_API_KEY_2 || "AIzaSyA9QT3tfih8nIVQoeCPQPr7HnozvgdxETo", // key 2
  process.env.GEMINI_API_KEY_3 || "AIzaSyCG7CGixqvdyZ4dQpQBcEXi-UKEhO_iLvA", // key 3
  process.env.GEMINI_API_KEY_4 || "AIzaSyDL_dlkXQnU2NXmNdEwsFYiAxAcTQCyIAg", // key 4
].filter(Boolean);

const OR_API_URL        = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_API_URL      = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_FLASH_25   = "gemini-2.5-flash";
const GEMINI_FLASH_20   = "gemini-2.0-flash";
const GEMINI_API_BASE   = "https://generativelanguage.googleapis.com/v1beta/models";

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 تعريف النماذج
// ═══════════════════════════════════════════════════════════════════════════

export interface AIModel {
  id: string;
  label: string;
  tier: number;
  maxTokens: number;
  contextWindow: number;
  provider: "openrouter" | "gemini" | "groq";
  geminiModel?: string;
}

export const PRIMARY_MODEL: AIModel = {
  id: "qwen/qwen3.6-plus:free",
  label: "Qwen 3.6 Plus",
  tier: 0,
  maxTokens: 4096,
  contextWindow: 1_000_000,
  provider: "openrouter",
};

export const GEMINI_25_MODEL: AIModel = {
  id: GEMINI_FLASH_25,
  label: "Gemini 2.5 Flash",
  tier: 1,
  maxTokens: 4096,
  contextWindow: 1_000_000,
  provider: "gemini",
  geminiModel: GEMINI_FLASH_25,
};

export const FALLBACK_MODEL: AIModel = {
  id: GEMINI_FLASH_20,
  label: "Gemini 2.0 Flash",
  tier: 2,
  maxTokens: 2048,
  contextWindow: 1_000_000,
  provider: "gemini",
  geminiModel: GEMINI_FLASH_20,
};

export const GROQ_MODEL: AIModel = {
  id: "llama-3.3-70b-versatile",
  label: "Llama 3.3 70B (Groq)",
  tier: 3,
  maxTokens: 4096,
  contextWindow: 128_000,
  provider: "groq",
};

export const ALL_MODELS: AIModel[] = [PRIMARY_MODEL, GEMINI_25_MODEL, FALLBACK_MODEL, GROQ_MODEL];

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️ Timeout
// ═══════════════════════════════════════════════════════════════════════════

export type RequestType = 'chat' | 'legal_analysis' | 'json_extraction' | 'fast' | 'tools';

export function getGlobalTimeout(type: RequestType): number {
  switch (type) {
    case 'legal_analysis':  return 28_000;
    case 'json_extraction': return 28_000;
    case 'tools':           return 28_000;
    case 'fast':            return 20_000;
    case 'chat':
    default:                return 28_000;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ Rate Limiting
// ═══════════════════════════════════════════════════════════════════════════

export interface RateLimitConfig {
  key: string;
  limit: number;
  window: number;
}

export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
): Promise<{ limited: boolean; errorMessage?: string }> {
  try {
    const ip = getClientIp(req);
    const { limited } = await rateLimit({
      key: config.key,
      identifier: ip,
      limit: config.limit,
      window: config.window,
    });
    if (limited) {
      return { limited: true, errorMessage: "تجاوزت الحد المسموح من الطلبات. انتظر قليلاً." };
    }
  } catch {
    // Fail-open
  }
  return { limited: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 AI Call — نظام Fallback ذكي رباعي المستويات
// ═══════════════════════════════════════════════════════════════════════════

export interface AICallOptions {
  systemPrompt: string;
  userMessage: string;
  messages?: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  globalTimeoutMs?: number;
  requestType?: RequestType;
  preferredModel?: string;
  /** إذا كان true سيتخطى OpenRouter ويبدأ مباشرة من Gemini */
  geminiOnly?: boolean;
}

export interface AIResult {
  content: string;
  model: AIModel;
  triedModels: string[];
  elapsedMs: number;
  timedOut: boolean;
  usedFallback: boolean;
}

export async function callAI(options: AICallOptions): Promise<AIResult> {
  const {
    systemPrompt,
    userMessage,
    messages,
    maxTokens,
    temperature = 0.4,
    globalTimeoutMs,
    requestType = 'chat',
    geminiOnly = false,
  } = options;

  const timeout    = globalTimeoutMs || getGlobalTimeout(requestType);
  const startTime  = Date.now();
  const triedModels: string[] = [];

  // ══════════════════════════════════════════════════════════
  // 🥇 المستوى الأول: OpenRouter (Qwen 3.6 Plus Free)
  // ══════════════════════════════════════════════════════════
  if (!geminiOnly && OPENROUTER_KEY) {
    triedModels.push(PRIMARY_MODEL.id);
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(timeout, 20_000));

    try {
      const content = await callOpenRouter(
        systemPrompt, userMessage, messages,
        maxTokens || PRIMARY_MODEL.maxTokens,
        temperature, ctrl.signal,
      );
      clearTimeout(timer);

      if (content) {
        return {
          content,
          model: PRIMARY_MODEL,
          triedModels,
          elapsedMs: Date.now() - startTime,
          timedOut: false,
          usedFallback: false,
        };
      }
      console.warn("[AI Core] OpenRouter رد فارغ → Gemini 2.5 Flash");
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      console.warn(`[AI Core] OpenRouter ${isAbort ? 'TIMEOUT' : 'ERROR'} → Gemini 2.5 Flash`);
    }
  } else if (!geminiOnly) {
    console.warn("[AI Core] OPENROUTER_API_KEY غير مضبوط → Gemini مباشرة");
  }

  // ══════════════════════════════════════════════════════════
  // 🥈 المستوى الثاني: Gemini 2.5 Flash
  // يجرب جميع المفاتيح الأربعة بالتناوب
  // ══════════════════════════════════════════════════════════
  triedModels.push(GEMINI_25_MODEL.id);

  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const timeLeft = timeout - (Date.now() - startTime);
    if (timeLeft < 3_000) break;

    const key    = GEMINI_KEYS[i];
    const ctrl2  = new AbortController();
    const timer2 = setTimeout(() => ctrl2.abort(), Math.min(timeLeft, 15_000));

    try {
      console.log(`[AI Core] 🟡 Gemini 2.5 Flash key #${i + 1}/${GEMINI_KEYS.length}...`);
      const content = await callGemini(
        systemPrompt, userMessage, messages,
        maxTokens || GEMINI_25_MODEL.maxTokens,
        temperature, ctrl2.signal, key, GEMINI_FLASH_25,
      );
      clearTimeout(timer2);

      if (content) {
        console.log(`[AI Core] ✅ Gemini 2.5 Flash key #${i + 1} نجح`);
        return {
          content,
          model: GEMINI_25_MODEL,
          triedModels,
          elapsedMs: Date.now() - startTime,
          timedOut: false,
          usedFallback: true,
        };
      }
      console.warn(`[AI Core] Gemini 2.5 Flash key #${i + 1} رد فارغ → key #${i + 2}`);
    } catch (err) {
      clearTimeout(timer2);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (isAbort) {
        return {
          content: '',
          model: GEMINI_25_MODEL,
          triedModels,
          elapsedMs: Date.now() - startTime,
          timedOut: true,
          usedFallback: true,
        };
      }
      const errMsg = err instanceof Error ? err.message : 'Unknown';
      console.warn(`[AI Core] Gemini 2.5 Flash key #${i + 1} خطأ (${errMsg}) → key #${i + 2}`);
    }
  }

  // ══════════════════════════════════════════════════════════
  // 🥉 المستوى الثالث: Gemini 2.0 Flash
  // يجرب جميع المفاتيح الأربعة بالتناوب
  // ══════════════════════════════════════════════════════════
  triedModels.push(FALLBACK_MODEL.id);

  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const timeLeft = timeout - (Date.now() - startTime);
    if (timeLeft < 3_000) break;

    const key    = GEMINI_KEYS[i];
    const ctrl3  = new AbortController();
    const timer3 = setTimeout(() => ctrl3.abort(), Math.min(timeLeft, 12_000));

    try {
      console.log(`[AI Core] 🔵 Gemini 2.0 Flash key #${i + 1}/${GEMINI_KEYS.length}...`);
      const content = await callGemini(
        systemPrompt, userMessage, messages,
        maxTokens || FALLBACK_MODEL.maxTokens,
        temperature, ctrl3.signal, key, GEMINI_FLASH_20,
      );
      clearTimeout(timer3);

      if (content) {
        console.log(`[AI Core] ✅ Gemini 2.0 Flash key #${i + 1} نجح`);
        return {
          content,
          model: FALLBACK_MODEL,
          triedModels,
          elapsedMs: Date.now() - startTime,
          timedOut: false,
          usedFallback: true,
        };
      }
      console.warn(`[AI Core] Gemini 2.0 Flash key #${i + 1} رد فارغ → key #${i + 2}`);
    } catch (err) {
      clearTimeout(timer3);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (isAbort) {
        return {
          content: '',
          model: FALLBACK_MODEL,
          triedModels,
          elapsedMs: Date.now() - startTime,
          timedOut: true,
          usedFallback: true,
        };
      }
      console.warn(`[AI Core] Gemini 2.0 Flash key #${i + 1} خطأ → key #${i + 2}`);
    }
  }

  // ══════════════════════════════════════════════════════════
  // 🏅 المستوى الرابع: Groq — llama-3.3-70b-versatile (خط الدفاع الأخير)
  // مجاني وسريع جداً — يعمل حتى عند انتهاء حصة Gemini
  // ══════════════════════════════════════════════════════════
  if (GROQ_KEY) {
    triedModels.push(GROQ_MODEL.id);
    const timeLeft = timeout - (Date.now() - startTime);

    if (timeLeft >= 3_000) {
      const ctrl4  = new AbortController();
      const timer4 = setTimeout(() => ctrl4.abort(), Math.min(timeLeft, 15_000));

      try {
        console.log("[AI Core] 🟣 Groq llama-3.3-70b...");
        const content = await callGroq(
          systemPrompt, userMessage, messages,
          maxTokens || GROQ_MODEL.maxTokens,
          temperature, ctrl4.signal,
        );
        clearTimeout(timer4);

        if (content) {
          console.log("[AI Core] ✅ Groq نجح");
          return {
            content,
            model: GROQ_MODEL,
            triedModels,
            elapsedMs: Date.now() - startTime,
            timedOut: false,
            usedFallback: true,
          };
        }
        console.warn("[AI Core] Groq رد فارغ");
      } catch (err) {
        clearTimeout(timer4);
        const isAbort = err instanceof Error && err.name === 'AbortError';
        console.warn(`[AI Core] Groq ${isAbort ? 'TIMEOUT' : 'ERROR'}:`, err);
      }
    }
  } else {
    console.warn("[AI Core] GROQ_API_KEY غير مضبوط — تخطي Groq");
  }

  // جميع المزودين فشلوا
  return {
    content: '',
    model: FALLBACK_MODEL,
    triedModels,
    elapsedMs: Date.now() - startTime,
    timedOut: false,
    usedFallback: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 OpenRouter — Qwen 3.6 Plus Free
// ═══════════════════════════════════════════════════════════════════════════

async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> | undefined,
  maxTokens: number,
  temperature: number,
  signal: AbortSignal,
): Promise<string | null> {
  if (!OPENROUTER_KEY) return null;

  const apiMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];
  if (history?.length) {
    for (const msg of history.slice(-10)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        apiMessages.push({ role: msg.role, content: String(msg.content || '').slice(0, 5000) });
      }
    }
  }
  apiMessages.push({ role: "user", content: userMessage });

  const startMs = Date.now();
  console.log(`[AI Core] 🟢 OpenRouter (${PRIMARY_MODEL.label})...`);

  try {
    const res = await fetch(OR_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hiyaat-dz.vercel.app",
        "X-Title": "Shamil DZ - Legal AI",
      },
      body: JSON.stringify({
        model: PRIMARY_MODEL.id,
        messages: apiMessages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal,
    });

    const elapsed = Date.now() - startMs;

    if (res.status === 429) {
      console.warn(`[AI Core] OpenRouter 429 في ${elapsed}ms → Fallback`);
      return null;
    }
    if (!res.ok) {
      console.error(`[AI Core] OpenRouter HTTP ${res.status} في ${elapsed}ms`);
      return null;
    }

    const data    = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (content && content.length > 5) {
      console.log(`[AI Core] ✅ OpenRouter: ${content.length} حرف في ${elapsed}ms`);
      return content;
    }
    console.warn(`[AI Core] OpenRouter رد فارغ في ${elapsed}ms`);
    return null;
  } catch (err) {
    const reason = err instanceof Error && err.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
    console.error(`[AI Core] OpenRouter ${reason}:`, err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 Google Gemini — يدعم 2.5 Flash و 2.0 Flash
// ═══════════════════════════════════════════════════════════════════════════

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> | undefined,
  maxTokens: number,
  temperature: number,
  signal: AbortSignal,
  apiKey: string,
  model: string,
): Promise<string | null> {
  if (!apiKey) return null;

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  if (history?.length) {
    for (const msg of history.slice(-10)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(msg.content || '').slice(0, 5000) }],
        });
      }
    }
  }
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const startMs = Date.now();
  const apiUrl  = `${GEMINI_API_BASE}/${model}:generateContent`;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topK: 40,
          topP: 0.95,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        ],
      }),
      signal,
    });

    const elapsed = Date.now() - startMs;

    if (res.status === 429) {
      console.warn(`[AI Core] Gemini (${model}) 429 في ${elapsed}ms → مفتاح آخر`);
      return null;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[AI Core] Gemini (${model}) HTTP ${res.status} في ${elapsed}ms: ${body.slice(0, 200)}`);
      return null;
    }

    const data    = await res.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (content && content.length > 5) {
      console.log(`[AI Core] ✅ Gemini (${model}): ${content.length} حرف في ${elapsed}ms`);
      return content;
    }
    console.warn(`[AI Core] Gemini (${model}) رد فارغ في ${elapsed}ms`);
    return null;
  } catch (err) {
    const reason = err instanceof Error && err.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
    console.error(`[AI Core] Gemini (${model}) ${reason}:`, err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 Groq — llama-3.3-70b-versatile (خط الدفاع الأخير)
// ═══════════════════════════════════════════════════════════════════════════

async function callGroq(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> | undefined,
  maxTokens: number,
  temperature: number,
  signal: AbortSignal,
): Promise<string | null> {
  if (!GROQ_KEY) return null;

  const apiMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];
  if (history?.length) {
    for (const msg of history.slice(-10)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        apiMessages.push({ role: msg.role, content: String(msg.content || '').slice(0, 5000) });
      }
    }
  }
  apiMessages.push({ role: "user", content: userMessage });

  const startMs = Date.now();
  console.log("[AI Core] 🟣 Groq (llama-3.3-70b-versatile)...");

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL.id,
        messages: apiMessages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal,
    });

    const elapsed = Date.now() - startMs;

    if (res.status === 429) {
      console.warn(`[AI Core] Groq 429 في ${elapsed}ms`);
      return null;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[AI Core] Groq HTTP ${res.status} في ${elapsed}ms: ${body.slice(0, 200)}`);
      return null;
    }

    const data    = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (content && content.length > 5) {
      console.log(`[AI Core] ✅ Groq: ${content.length} حرف في ${elapsed}ms`);
      return content;
    }
    console.warn(`[AI Core] Groq رد فارغ في ${elapsed}ms`);
    return null;
  } catch (err) {
    const reason = err instanceof Error && err.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
    console.error(`[AI Core] Groq ${reason}:`, err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📄 JSON Parser
// ═══════════════════════════════════════════════════════════════════════════

export function extractJSON(raw: string): string | null {
  const trimmed = raw.trim();
  try { JSON.parse(trimmed); return trimmed; } catch {}

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { JSON.parse(codeBlockMatch[1].trim()); return codeBlockMatch[1].trim(); } catch {}
  }

  let depth = 0, start = -1;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (trimmed[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try { JSON.parse(trimmed.substring(start, i + 1)); return trimmed.substring(start, i + 1); } catch { start = -1; }
      }
    }
  }

  if (start !== -1) {
    let t = trimmed.substring(start);
    t = t.replace(/,\s*"[^"]*"\s*:?\s*$/, '').replace(/,\s*$/, '');
    const ob = (t.match(/\{/g) || []).length - (t.match(/\}/g) || []).length;
    const oa = (t.match(/\[/g) || []).length - (t.match(/\]/g) || []).length;
    t += ']'.repeat(Math.max(0, oa)) + '}'.repeat(Math.max(0, ob));
    try { JSON.parse(t); return t; } catch {}
  }

  return null;
}

export function parseJSON<T = Record<string, unknown>>(raw: string): T | null {
  const jsonStr = extractJSON(raw);
  if (!jsonStr) return null;
  try { return JSON.parse(jsonStr) as T; } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏷️ مساعد SSE — إرسال أحداث الـ streaming
// ═══════════════════════════════════════════════════════════════════════════

export function createSSEStream(
  handler: (send: (event: string, data: unknown) => void, close: () => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { closed = true; }
      };

      const close = () => {
        if (!closed) {
          closed = true;
          try { controller.close(); } catch {}
        }
      };

      try {
        await handler(send, close);
      } catch (err) {
        console.error("[SSE] Fatal error:", err);
        send("error", { error: "حدث خطأ في الخادم." });
        close();
      }
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
