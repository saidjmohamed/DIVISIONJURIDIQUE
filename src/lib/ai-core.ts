/**
 * AI Core — محرك الذكاء الاصطناعي (v7 — Fallback System)
 *
 * 🥇 المزود الأول:  OpenRouter → qwen/qwen3.6-plus:free
 * 🥈 المزود الثاني: Perplexity → sonar  (fallback تلقائي)
 *
 * الانتقال يحدث تلقائياً عند:
 *   - Rate limit (429)
 *   - خطأ في الخادم (5xx)
 *   - Timeout
 *   - رد فارغ
 *
 * Used by: /api/ai, /api/gemini, /api/petition-check
 */

import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════
// 🔑 مفاتيح API
// ═══════════════════════════════════════════════════════════════════════════

const OPENROUTER_KEY  = process.env.OPENROUTER_API_KEY;
const PERPLEXITY_KEY  = process.env.PERPLEXITY_API_KEY;

const OR_API_URL   = "https://openrouter.ai/api/v1/chat/completions";
const PPLX_API_URL = "https://api.perplexity.ai/chat/completions";

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 تعريف النماذج
// ═══════════════════════════════════════════════════════════════════════════

export interface AIModel {
  id: string;
  label: string;
  tier: number;
  maxTokens: number;
  contextWindow: number;
  provider: "openrouter" | "perplexity";
}

export const PRIMARY_MODEL: AIModel = {
  id: "qwen/qwen3.6-plus:free",
  label: "Qwen 3.6 Plus",
  tier: 0,
  maxTokens: 4096,
  contextWindow: 1_000_000,
  provider: "openrouter",
};

export const FALLBACK_MODEL: AIModel = {
  id: "sonar",
  label: "Perplexity Sonar",
  tier: 1,
  maxTokens: 4096,
  contextWindow: 128_000,
  provider: "perplexity",
};

export const ALL_MODELS: AIModel[] = [PRIMARY_MODEL, FALLBACK_MODEL];

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️ Timeout
// ═══════════════════════════════════════════════════════════════════════════

export type RequestType = 'chat' | 'legal_analysis' | 'json_extraction' | 'fast';

export function getGlobalTimeout(type: RequestType): number {
  switch (type) {
    case 'legal_analysis':  return 28_000;
    case 'json_extraction': return 28_000;
    case 'fast':            return 28_000;
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
// 🤖 AI Call — مع نظام Fallback تلقائي
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
  } = options;

  const timeout    = globalTimeoutMs || getGlobalTimeout(requestType);
  const startTime  = Date.now();
  const triedModels: string[] = [];

  // ── المحاولة الأولى: OpenRouter (Qwen 3.6 Plus Free) ──
  if (OPENROUTER_KEY) {
    triedModels.push(PRIMARY_MODEL.id);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(timeout, 20_000));

    try {
      const content = await callOpenRouter(
        systemPrompt, userMessage, messages,
        maxTokens || PRIMARY_MODEL.maxTokens,
        temperature, controller.signal,
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
      // رد فارغ — انتقل إلى Fallback
      console.warn("[AI Core] OpenRouter returned empty — switching to Perplexity fallback");
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      console.warn(`[AI Core] OpenRouter ${isAbort ? 'TIMEOUT' : 'ERROR'} — switching to Perplexity fallback`);
    }
  } else {
    console.warn("[AI Core] OPENROUTER_API_KEY غير مضبوط — جرب Perplexity مباشرة");
  }

  // ── المحاولة الثانية: Perplexity (Sonar) ──
  if (PERPLEXITY_KEY) {
    triedModels.push(FALLBACK_MODEL.id);
    const remainingTime = timeout - (Date.now() - startTime);
    if (remainingTime < 3_000) {
      // لا وقت كافٍ للمحاولة الثانية
      return {
        content: '',
        model: FALLBACK_MODEL,
        triedModels,
        elapsedMs: Date.now() - startTime,
        timedOut: true,
        usedFallback: true,
      };
    }

    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), remainingTime);

    try {
      const content = await callPerplexity(
        systemPrompt, userMessage, messages,
        maxTokens || FALLBACK_MODEL.maxTokens,
        temperature, controller2.signal,
      );
      clearTimeout(timer2);

      if (content) {
        console.log("[AI Core] ✅ Perplexity fallback نجح");
        return {
          content,
          model: FALLBACK_MODEL,
          triedModels,
          elapsedMs: Date.now() - startTime,
          timedOut: false,
          usedFallback: true,
        };
      }
    } catch (err) {
      clearTimeout(timer2);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      console.error(`[AI Core] Perplexity ${isAbort ? 'TIMEOUT' : 'ERROR'}:`, err);
      return {
        content: '',
        model: FALLBACK_MODEL,
        triedModels,
        elapsedMs: Date.now() - startTime,
        timedOut: isAbort,
        usedFallback: true,
      };
    }
  } else {
    console.warn("[AI Core] PERPLEXITY_API_KEY غير مضبوط — لا يوجد fallback");
  }

  // كلا المزودين فشلا
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

  if (history && history.length > 0) {
    for (const msg of history.slice(-10)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        apiMessages.push({ role: msg.role, content: String(msg.content || '').slice(0, 5000) });
      }
    }
  }

  apiMessages.push({ role: "user", content: userMessage });

  const startMs = Date.now();
  console.log(`[AI Core] 🟢 استدعاء OpenRouter (${PRIMARY_MODEL.label})...`);

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

    // 429 = rate limit → trigger fallback
    if (res.status === 429) {
      console.warn(`[AI Core] OpenRouter 429 Rate Limit في ${elapsed}ms → Fallback`);
      return null;
    }

    if (!res.ok) {
      console.error(`[AI Core] OpenRouter HTTP ${res.status} في ${elapsed}ms`);
      return null;
    }

    const data = await res.json();
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
// 🔌 Perplexity — Sonar (Fallback)
// ═══════════════════════════════════════════════════════════════════════════

async function callPerplexity(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> | undefined,
  maxTokens: number,
  temperature: number,
  signal: AbortSignal,
): Promise<string | null> {
  if (!PERPLEXITY_KEY) return null;

  const apiMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  if (history && history.length > 0) {
    for (const msg of history.slice(-10)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        apiMessages.push({ role: msg.role, content: String(msg.content || '').slice(0, 5000) });
      }
    }
  }

  apiMessages.push({ role: "user", content: userMessage });

  const startMs = Date.now();
  console.log(`[AI Core] 🔵 استدعاء Perplexity Fallback (${FALLBACK_MODEL.label})...`);

  try {
    const res = await fetch(PPLX_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: FALLBACK_MODEL.id,
        messages: apiMessages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal,
    });

    const elapsed = Date.now() - startMs;

    if (!res.ok) {
      console.error(`[AI Core] Perplexity HTTP ${res.status} في ${elapsed}ms`);
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (content && content.length > 5) {
      console.log(`[AI Core] ✅ Perplexity: ${content.length} حرف في ${elapsed}ms`);
      return content;
    }

    console.warn(`[AI Core] Perplexity رد فارغ في ${elapsed}ms`);
    return null;
  } catch (err) {
    const reason = err instanceof Error && err.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
    console.error(`[AI Core] Perplexity ${reason}:`, err);
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
