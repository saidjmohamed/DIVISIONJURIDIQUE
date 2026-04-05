/**
 * AI Core — محرك الذكاء الاصطناعي الموحد (v2)
 *
 * ⚡ Performance-optimized shared logic:
 * - Global timeout (configurable)
 * - Max models limit (prevent cascading)
 * - Per-model tier-based timeouts
 * - AbortController with global signal linking
 *
 * Used by: petition-check, ai-chat, future tools
 */

import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ─── Model Configuration ───────────────────────────────────

export interface AIModel {
  id: string;
  label: string;
  tier: number;
  maxTokens: number;
}

export const AI_MODELS: AIModel[] = [
  { id: "qwen/qwen3.6-plus:free",                 label: "Qwen 3.6 Plus",        tier: 0, maxTokens: 4096 },
  { id: "stepfun/step-3.5-flash:free",            label: "Step 3.5 Flash",        tier: 1, maxTokens: 4096 },
  { id: "openai/gpt-oss-20b:free",                label: "GPT OSS 20B",           tier: 1, maxTokens: 4096 },
  { id: "openai/gpt-oss-120b:free",               label: "GPT OSS 120B",          tier: 2, maxTokens: 4096 },
];

// ─── Timeout Configuration ─────────────────────────────────

export const TIMEOUT_CONFIG = {
  tier0: 8_000,   // Primary model: 8s
  tier1: 6_000,   // Fast fallback: 6s
  tier2: 6_000,   // Strong fallback: 6s
  tier3: 5_000,   // Last resort: 5s
} as const;

export function getTierTimeout(tier: number): number {
  switch (tier) {
    case 0: return TIMEOUT_CONFIG.tier0;
    case 1: return TIMEOUT_CONFIG.tier1;
    case 2: return TIMEOUT_CONFIG.tier2;
    default: return TIMEOUT_CONFIG.tier3;
  }
}

// ─── Rate Limiting Helper ─────────────────────────────────

export interface RateLimitConfig {
  key: string;
  limit: number;
  window: number;
}

export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
): Promise<{ limited: boolean; errorMessage?: string }> {
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
  return { limited: false };
}

// ─── AI Call with Retry & Fallback ────────────────────────

export interface AICallOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  globalTimeoutMs?: number;
  maxModelsToTry?: number;
  retries?: number;
  retryMessage?: string;
  maxTier?: number;
}

export interface AIResult {
  content: string;
  model: AIModel;
  triedModels: string[];
  elapsedMs: number;
  timedOut: boolean;
}

export async function callAI(options: AICallOptions): Promise<AIResult | null> {
  if (!OPENROUTER_KEY) return null;

  const {
    systemPrompt,
    userMessage,
    temperature = 0.2,
    globalTimeoutMs = 14_000,
    maxModelsToTry = 3,
    retries = 0,
    retryMessage,
    maxTier = 2,
  } = options;

  const globalController = new AbortController();
  const globalTimer = setTimeout(() => globalController.abort(), globalTimeoutMs);

  const tried: string[] = [];
  const startTime = Date.now();
  let modelsTried = 0;

  try {
    for (const model of AI_MODELS) {
      if (model.tier > maxTier) continue;
      if (globalController.signal.aborted) break;
      if (modelsTried >= maxModelsToTry) break;

      tried.push(model.id);
      modelsTried++;

      const maxTok = options.maxTokens || model.maxTokens;
      const timeout = getTierTimeout(model.tier);

      // First attempt
      const result = await callSingleModel(
        systemPrompt, userMessage, model, maxTok, temperature, timeout, globalController.signal,
      );
      if (result) {
        clearTimeout(globalTimer);
        return {
          content: result, model, triedModels: tried,
          elapsedMs: Date.now() - startTime, timedOut: false,
        };
      }

      // Retry on Tier 0
      if (model.tier === 0 && retries > 0 && !globalController.signal.aborted) {
        const retryMsg = userMessage + (retryMessage || "\n\n⚠️ ردك لم يكن بالصيغة المطلوبة. أعد المحاولة.");
        const retryResult = await callSingleModel(
          systemPrompt, retryMsg, model, maxTok, temperature, timeout * 1.2, globalController.signal,
        );
        if (retryResult) {
          clearTimeout(globalTimer);
          return {
            content: retryResult, model, triedModels: tried,
            elapsedMs: Date.now() - startTime, timedOut: false,
          };
        }
      }
    }

    clearTimeout(globalTimer);
    return {
      content: '', model: AI_MODELS[0], triedModels: tried,
      elapsedMs: Date.now() - startTime, timedOut: globalController.signal.aborted,
    };
  } catch {
    clearTimeout(globalTimer);
    return null;
  }
}

async function callSingleModel(
  systemPrompt: string,
  userMessage: string,
  model: AIModel,
  maxTokens: number,
  temperature: number,
  timeout: number,
  globalSignal: AbortSignal,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const onGlobalAbort = () => controller.abort();
  globalSignal.addEventListener("abort", onGlobalAbort, { once: true });

  const cleanup = () => {
    clearTimeout(timer);
    globalSignal.removeEventListener("abort", onGlobalAbort);
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hiyaat-dz.vercel.app",
        "X-Title": "Shamil DZ - Legal AI",
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });
    // DON'T clear timer here — body read can also hang

    if (!res.ok) {
      cleanup();
      return null;
    }

    // Body read — covered by timeout until cleared
    const data = await res.json();
    cleanup();

    const content = data?.choices?.[0]?.message?.content?.trim();
    return content && content.length > 20 ? content : null;
  } catch {
    cleanup();
    return null;
  }
}

// ─── JSON Parser ──────────────────────────────────────────

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
