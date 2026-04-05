/**
 * AI Core — محرك الذكاء الاصطناعي (v6)
 *
 * 🧠 Qwen 3.6 Plus Free — النموذج الوحيد
 * لا يوجد fallback، لا backup، Qwen فقط.
 *
 * Used by: /api/ai, /api/petition-check
 */

import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OR_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 النموذج الوحيد — Qwen 3.6 Plus Free
// ═══════════════════════════════════════════════════════════════════════════

export interface AIModel {
  id: string;
  label: string;
  tier: number;
  maxTokens: number;
  contextWindow: number;
}

export const PRIMARY_MODEL: AIModel = {
  id: "qwen/qwen3.6-plus:free",
  label: "Qwen 3.6 Plus",
  tier: 0,
  maxTokens: 4096,
  contextWindow: 1_000_000,
};

// Legacy exports — kept for compatibility with route.ts imports
export const TIER1_MODELS: AIModel[] = [PRIMARY_MODEL];
export const TIER2_MODELS: AIModel[] = [];
export const TIER3_MODELS: AIModel[] = [];
export const ALL_MODELS: AIModel[] = [PRIMARY_MODEL];

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️ TIMEOUT
// ═══════════════════════════════════════════════════════════════════════════

export type RequestType = 'chat' | 'legal_analysis' | 'json_extraction' | 'fast';

export function getGlobalTimeout(type: RequestType): number {
  switch (type) {
    case 'legal_analysis': return 28_000;
    case 'json_extraction': return 28_000;
    case 'fast':            return 28_000;
    case 'chat':
    default:                return 28_000;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ RATE LIMITING
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
// 🤖 AI CALL — Qwen 3.6 Plus فقط
// ═══════════════════════════════════════════════════════════════════════════

export interface AICallOptions {
  systemPrompt: string;
  userMessage: string;
  messages?: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  globalTimeoutMs?: number;
  maxModelsToTry?: number;
  requestType?: RequestType;
  preferredModel?: string;
}

export interface AIResult {
  content: string;
  model: AIModel;
  triedModels: string[];
  elapsedMs: number;
  timedOut: boolean;
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

  const timeout = globalTimeoutMs || getGlobalTimeout(requestType);
  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const makeResult = (content: string): AIResult => ({
    content,
    model: PRIMARY_MODEL,
    triedModels: [PRIMARY_MODEL.id],
    elapsedMs: Date.now() - startTime,
    timedOut: false,
  });

  const makeFailResult = (timedOut: boolean): AIResult => ({
    content: '',
    model: PRIMARY_MODEL,
    triedModels: [PRIMARY_MODEL.id],
    elapsedMs: Date.now() - startTime,
    timedOut,
  });

  try {
    const content = await callOpenRouter(
      systemPrompt,
      userMessage,
      messages,
      maxTokens || PRIMARY_MODEL.maxTokens,
      temperature,
      controller.signal,
    );

    clearTimeout(timer);

    if (content) return makeResult(content);

    return makeFailResult(false);
  } catch {
    clearTimeout(timer);
    return makeFailResult(controller.signal.aborted);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 OpenRouter Call
// ═══════════════════════════════════════════════════════════════════════════

async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> | undefined,
  maxTokens: number,
  temperature: number,
  signal: AbortSignal,
): Promise<string | null> {
  if (!OPENROUTER_KEY) {
    console.error("[AI Core] OPENROUTER_API_KEY غير مضبوط");
    return null;
  }

  const apiMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  if (history && history.length > 0) {
    for (const msg of history.slice(-10)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        apiMessages.push({
          role: msg.role,
          content: String(msg.content || '').slice(0, 5000),
        });
      }
    }
  }

  apiMessages.push({ role: "user", content: userMessage });

  const startMs = Date.now();
  console.log(`[AI Core] استدعاء ${PRIMARY_MODEL.label}...`);

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

    if (!res.ok) {
      console.error(`[AI Core] HTTP ${res.status} في ${elapsed}ms`);
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (content && content.length > 5) {
      console.log(`[AI Core] ✅ ${content.length} حرف في ${elapsed}ms`);
      return content;
    }

    console.warn(`[AI Core] رد فارغ في ${elapsed}ms`);
    return null;
  } catch (err) {
    const reason = err instanceof Error && err.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
    console.error(`[AI Core] ${reason}:`, err);
    return null;
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
