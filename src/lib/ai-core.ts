/**
 * AI Core — محرك الذكاء الاصطناعي الموحد (v3)
 *
 * 🧠 Smart Model Routing & Fallback System
 * - 3 tiers of FREE OpenRouter models
 * - Smart routing based on request type
 * - Intelligent fallback with retry
 * - Global timeout protection
 * - Gemini as ultimate fallback (if configured)
 *
 * Used by: /api/ai, /api/petition-check
 */

import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const OR_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 MODEL REGISTRY — All FREE models, ranked by tier
// ═══════════════════════════════════════════════════════════════════════════

export interface AIModel {
  id: string;
  label: string;
  tier: number;        // 1=Strongest, 2=Balanced, 3=Fast
  maxTokens: number;
  contextWindow: number;
}

/**
 * 🥇 TIER 1 — Strongest (legal reasoning, complex analysis)
 *    Large context, high quality
 */
export const TIER1_MODELS: AIModel[] = [
  { id: "qwen/qwen3.6-plus:free",                 label: "Qwen 3.6 Plus",        tier: 1, maxTokens: 4096, contextWindow: 1_000_000 },
  { id: "z-ai/glm-4.5-air:free",                  label: "GLM 4.5 Air",          tier: 1, maxTokens: 4096, contextWindow: 131_072 },
  { id: "qwen/qwen3-coder:free",                  label: "Qwen3 Coder",           tier: 1, maxTokens: 4096, contextWindow: 262_000 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B",      tier: 1, maxTokens: 4096, contextWindow: 65_536 },
];

/**
 * 🥈 TIER 2 — Balanced (good speed + quality)
 *    Medium size, reliable
 */
export const TIER2_MODELS: AIModel[] = [
  { id: "openai/gpt-oss-120b:free",               label: "GPT OSS 120B",          tier: 2, maxTokens: 4096, contextWindow: 131_072 },
  { id: "google/gemma-3-27b-it:free",             label: "Gemma 3 27B",           tier: 2, maxTokens: 4096, contextWindow: 131_072 },
  { id: "arcee-ai/trinity-mini:free",             label: "Trinity Mini",          tier: 2, maxTokens: 4096, contextWindow: 131_072 },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free",  label: "Qwen3 Next 80B",       tier: 2, maxTokens: 4096, contextWindow: 262_144 },
];

/**
 * 🥉 TIER 3 — Fast (quick responses, simple tasks)
 *    Small, fast, reliable
 */
export const TIER3_MODELS: AIModel[] = [
  { id: "google/gemma-3-12b-it:free",             label: "Gemma 3 12B",           tier: 3, maxTokens: 2048, contextWindow: 32_768 },
  { id: "openai/gpt-oss-20b:free",                label: "GPT OSS 20B",           tier: 3, maxTokens: 2048, contextWindow: 131_072 },
  { id: "meta-llama/llama-3.2-3b-instruct:free",  label: "Llama 3.2 3B",        tier: 3, maxTokens: 2048, contextWindow: 131_072 },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free",    label: "Nemotron 30B",          tier: 3, maxTokens: 2048, contextWindow: 256_000 },
];

// Flat list of ALL models (used by GET /api/ai for model selector)
export const ALL_MODELS: AIModel[] = [...TIER1_MODELS, ...TIER2_MODELS, ...TIER3_MODELS];

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️ TIMEOUT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const TIMEOUT_CONFIG = {
  tier1: 12_000,   // Strongest: 12s (larger models need more time)
  tier2: 8_000,    // Balanced: 8s
  tier3: 6_000,    // Fast: 6s
} as const;

export function getTierTimeout(tier: number): number {
  switch (tier) {
    case 1: return TIMEOUT_CONFIG.tier1;
    case 2: return TIMEOUT_CONFIG.tier2;
    case 3: return TIMEOUT_CONFIG.tier3;
    default: return 6_000;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚡ SMART ROUTING — Select model tier based on request type
// ═══════════════════════════════════════════════════════════════════════════

export type RequestType = 'chat' | 'legal_analysis' | 'json_extraction' | 'fast';

export function getModelsForRequest(type: RequestType): AIModel[] {
  switch (type) {
    case 'legal_analysis':
      // Tier 1 → Tier 2 (strongest models for complex legal reasoning)
      return [...TIER1_MODELS.slice(0, 2), ...TIER2_MODELS.slice(0, 2)];
    case 'json_extraction':
      // Tier 1 → Tier 2 (need strong models for structured output)
      return [...TIER1_MODELS.slice(0, 2), ...TIER2_MODELS.slice(0, 2)];
    case 'fast':
      // Tier 3 → Tier 2 (prioritize speed)
      return [...TIER3_MODELS.slice(0, 2), ...TIER2_MODELS.slice(0, 1)];
    case 'chat':
    default:
      // All tiers: start strong, fallback to fast
      return [...TIER1_MODELS.slice(0, 1), ...TIER2_MODELS.slice(0, 2), ...TIER3_MODELS.slice(0, 1)];
  }
}

export function getGlobalTimeout(type: RequestType): number {
  switch (type) {
    case 'legal_analysis': return 20_000;
    case 'json_extraction': return 18_000;
    case 'fast': return 12_000;
    case 'chat':
    default: return 20_000;
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
    // Fail-open: continue if rate limiting fails
  }
  return { limited: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 AI CALL ENGINE — Unified call with retry, fallback, timeout
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
    temperature = 0.4,
    globalTimeoutMs,
    maxModelsToTry = 4,
    requestType = 'chat',
    preferredModel,
  } = options;

  const models = getModelsForRequest(requestType);
  const globalTimeout = globalTimeoutMs || getGlobalTimeout(requestType);
  const globalController = new AbortController();
  const globalTimer = setTimeout(() => globalController.abort(), globalTimeout);

  const tried: string[] = [];
  const startTime = Date.now();
  let modelsTried = 0;

  try {
    // Try preferred model first (if specified and in our model list)
    if (preferredModel) {
      const pref = ALL_MODELS.find(m => m.id === preferredModel);
      if (pref && !globalController.signal.aborted) {
        tried.push(pref.id);
        modelsTried++;
        const result = await callOpenRouter(
          systemPrompt, userMessage, messages, pref, temperature, globalController.signal,
        );
        if (result) {
          clearTimeout(globalTimer);
          return {
            content: result,
            model: pref,
            triedModels: tried,
            elapsedMs: Date.now() - startTime,
            timedOut: false,
          };
        }
      }
    }

    // Fallback chain
    for (const model of models) {
      if (globalController.signal.aborted) break;
      if (tried.includes(model.id)) continue;
      if (modelsTried >= maxModelsToTry) break;

      tried.push(model.id);
      modelsTried++;

      const maxTok = options.maxTokens || model.maxTokens;
      const timeout = getTierTimeout(model.tier);

      const result = await callOpenRouter(
        systemPrompt, userMessage, messages,
        { ...model, maxTokens: maxTok },
        temperature, globalController.signal, timeout,
      );
      if (result) {
        clearTimeout(globalTimer);
        return {
          content: result,
          model,
          triedModels: tried,
          elapsedMs: Date.now() - startTime,
          timedOut: false,
        };
      }
    }

    // Final fallback: Gemini (if API key available)
    if (GEMINI_KEY && !globalController.signal.aborted) {
      tried.push('gemini-2.5-flash');
      console.log(`[AI Core] OpenRouter exhausted, trying Gemini fallback...`);
      const geminiResult = await callGemini(systemPrompt, userMessage, messages, temperature, globalController.signal);
      if (geminiResult) {
        clearTimeout(globalTimer);
        return {
          content: geminiResult,
          model: { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: 0, maxTokens: 4096, contextWindow: 1_000_000 },
          triedModels: tried,
          elapsedMs: Date.now() - startTime,
          timedOut: false,
        };
      }
    }

    clearTimeout(globalTimer);
    return {
      content: '',
      model: models[0],
      triedModels: tried,
      elapsedMs: Date.now() - startTime,
      timedOut: globalController.signal.aborted,
    };
  } catch (err) {
    clearTimeout(globalTimer);
    console.error('[AI Core] Fatal:', err);
    return {
      content: '',
      model: models[0],
      triedModels: tried,
      elapsedMs: Date.now() - startTime,
      timedOut: true,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 OpenRouter Call
// ═══════════════════════════════════════════════════════════════════════════

async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> | undefined,
  model: AIModel,
  temperature: number,
  globalSignal: AbortSignal,
  overrideTimeout?: number,
): Promise<string | null> {
  if (!OPENROUTER_KEY) return null;

  const timeout = overrideTimeout || getTierTimeout(model.tier);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const onGlobalAbort = () => controller.abort();
  globalSignal.addEventListener("abort", onGlobalAbort, { once: true });

  const cleanup = () => {
    clearTimeout(timer);
    globalSignal.removeEventListener("abort", onGlobalAbort);
  };

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add history if provided (last 10 messages, validated roles only)
    if (history && history.length > 0) {
      const recent = history.slice(-10);
      for (const msg of recent) {
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

    const res = await fetch(OR_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hiyaat-dz.vercel.app",
        "X-Title": "Shamil DZ - Legal AI",
      },
      body: JSON.stringify({
        model: model.id,
        messages: apiMessages,
        max_tokens: model.maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      cleanup();
      console.log(`[OpenRouter] ${model.label}: HTTP ${res.status} in ${Date.now() - startMs}ms`);
      return null;
    }

    const data = await res.json();
    cleanup();

    const content = data?.choices?.[0]?.message?.content?.trim();
    const elapsed = Date.now() - startMs;

    if (content && content.length > 5) {
      console.log(`[OpenRouter] ${model.label}: ${content.length} chars in ${elapsed}ms ✅`);
      return content;
    }

    console.log(`[OpenRouter] ${model.label}: empty/short response in ${elapsed}ms`);
    return null;
  } catch (err) {
    cleanup();
    const reason = err instanceof Error && err.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
    console.log(`[OpenRouter] ${model.label}: ${reason}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 Gemini Call (Ultimate Fallback)
// ═══════════════════════════════════════════════════════════════════════════

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> | undefined,
  temperature: number,
  globalSignal: AbortSignal,
): Promise<string | null> {
  if (!GEMINI_KEY) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  globalSignal.addEventListener("abort", () => controller.abort(), { once: true });

  const cleanup = () => {
    clearTimeout(timer);
  };

  try {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(msg.content || '').slice(0, 5000) }],
          });
        }
      }
    }

    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const res = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_KEY,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature, maxOutputTokens: 4096 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        ],
      }),
      signal: controller.signal,
    });

    cleanup();

    if (!res.ok) {
      console.log(`[Gemini] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (text && text.length > 5) {
      console.log(`[Gemini] ${text.length} chars ✅`);
      return text;
    }

    return null;
  } catch (err) {
    cleanup();
    console.log(`[Gemini] ${(err instanceof Error && err.name === 'AbortError') ? 'TIMEOUT' : 'ERROR'}`);
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
