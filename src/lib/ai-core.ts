/**
 * AI Core — محرك الذكاء الاصطناعي الموحد (v5)
 *
 * 🧠 Primary Model + Parallel Backup Strategy:
 * - Qwen 3.6 Plus is the PRIMARY model for ALL requests
 * - Gets generous 15s timeout (it's the main workhorse)
 * - If it fails, 2 backup models tried quickly (5s each)
 * - Gemini runs in parallel after 10s delay (last resort)
 * - First successful response wins
 *
 * Used by: /api/ai, /api/petition-check
 */

import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
// Gemini key: env var first, then hardcoded fallback (user-provided backup)
const GEMINI_KEY = process.env.GEMINI_API_KEY || "AIzaSyDLlsNaQFMrGgBlyFRdAQAjwDwYh_m4wiM";
const OR_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 PRIMARY MODEL — Qwen 3.6 Plus (used for ALL requests)
// ═══════════════════════════════════════════════════════════════════════════

export const PRIMARY_MODEL: AIModel = {
  id: "qwen/qwen3.6-plus:free",
  label: "Qwen 3.6 Plus",
  tier: 0,             // tier 0 = primary (special)
  maxTokens: 4096,
  contextWindow: 1_000_000,
};

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 BACKUP MODELS — Only used if primary fails
// ═══════════════════════════════════════════════════════════════════════════

export interface AIModel {
  id: string;
  label: string;
  tier: number;
  maxTokens: number;
  contextWindow: number;
}

const BACKUP_MODELS: AIModel[] = [
  { id: "z-ai/glm-4.5-air:free",                  label: "GLM 4.5 Air",          tier: 2, maxTokens: 4096, contextWindow: 131_072 },
  { id: "google/gemma-3-27b-it:free",             label: "Gemma 3 27B",           tier: 2, maxTokens: 4096, contextWindow: 131_072 },
];

// Legacy tier arrays — kept for GET /api/ai model selector
export const TIER1_MODELS: AIModel[] = [PRIMARY_MODEL];
export const TIER2_MODELS: AIModel[] = BACKUP_MODELS;
export const TIER3_MODELS: AIModel[] = [
  { id: "google/gemma-3-12b-it:free",             label: "Gemma 3 12B",           tier: 3, maxTokens: 2048, contextWindow: 32_768 },
  { id: "openai/gpt-oss-20b:free",                label: "GPT OSS 20B",           tier: 3, maxTokens: 2048, contextWindow: 131_072 },
];

// Flat list for model selector UI
export const ALL_MODELS: AIModel[] = [PRIMARY_MODEL, ...BACKUP_MODELS, ...TIER3_MODELS];

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️ TIMEOUT CONFIGURATION (v4 — optimized for parallel race)
// ═══════════════════════════════════════════════════════════════════════════

export const TIMEOUT_CONFIG = {
  primary: 25_000,      // Primary model (free tier is slow: simple=10s, real=20-25s)
  backup: 5_000,        // Backup models get 5s each
  geminiDelay: 0,       // Start Gemini IMMEDIATELY in parallel (no delay)
  geminiTimeout: 25_000, // Gemini gets same timeout as primary
} as const;

export function getTierTimeout(tier: number): number {
  switch (tier) {
    case 0: return TIMEOUT_CONFIG.primary;  // Primary model
    case 2: return TIMEOUT_CONFIG.backup;    // Backup models
    case 3: return TIMEOUT_CONFIG.backup;    // Fast models
    default: return TIMEOUT_CONFIG.backup;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚡ SMART ROUTING — Select model tier based on request type
// ═══════════════════════════════════════════════════════════════════════════

export type RequestType = 'chat' | 'legal_analysis' | 'json_extraction' | 'fast';

export function getModelsForRequest(type: RequestType): AIModel[] {
  switch (type) {
    case 'legal_analysis':
      return [...TIER1_MODELS.slice(0, 2), ...TIER2_MODELS.slice(0, 2)];
    case 'json_extraction':
      return [...TIER1_MODELS.slice(0, 2), ...TIER2_MODELS.slice(0, 2)];
    case 'fast':
      return [...TIER3_MODELS.slice(0, 2), ...TIER2_MODELS.slice(0, 1)];
    case 'chat':
    default:
      return [...TIER1_MODELS.slice(0, 1), ...TIER2_MODELS.slice(0, 2), ...TIER3_MODELS.slice(0, 1)];
  }
}

export function getGlobalTimeout(type: RequestType): number {
  switch (type) {
    case 'legal_analysis': return 28_000;
    case 'json_extraction': return 28_000;
    case 'fast': return 28_000;
    case 'chat':
    default: return 28_000;
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
// 🤖 AI CALL ENGINE — Parallel Race (OpenRouter || Gemini)
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

  // Shared state between OpenRouter chain and Gemini racer
  let resolved = false;
  let modelsTried = 0;

  const makeResult = (content: string, model: AIModel): AIResult => ({
    content,
    model,
    triedModels: [...tried],
    elapsedMs: Date.now() - startTime,
    timedOut: false,
  });

  const makeFailResult = (timedOut: boolean): AIResult => ({
    content: '',
    model: models[0],
    triedModels: [...tried],
    elapsedMs: Date.now() - startTime,
    timedOut,
  });

  try {
    // ── Track OpenRouter chain ──
    const orDone = new Promise<string | null>(async (resolve) => {
      // 1. Try PRIMARY model first (Qwen 3.6 Plus) — with generous 15s timeout
      if (!resolved && !globalController.signal.aborted) {
        const primaryModel = preferredModel
          ? ALL_MODELS.find(m => m.id === preferredModel) || PRIMARY_MODEL
          : PRIMARY_MODEL;

        tried.push(primaryModel.id);
        modelsTried++;
        console.log(`[AI Core] Trying primary: ${primaryModel.label} (timeout: ${TIMEOUT_CONFIG.primary}ms)...`);

        const result = await callOpenRouter(
          systemPrompt, userMessage, messages, primaryModel, temperature, globalController.signal,
          TIMEOUT_CONFIG.primary,
        );
        if (result) { resolved = true; resolve(result); return; }
        console.log(`[AI Core] Primary failed, trying backups...`);
      }

      // 2. Quick backup fallback (2 models × 5s each)
      for (const model of BACKUP_MODELS) {
        if (resolved || globalController.signal.aborted) break;
        if (modelsTried >= maxModelsToTry) break;

        tried.push(model.id);
        modelsTried++;

        const maxTok = options.maxTokens || model.maxTokens;

        const result = await callOpenRouter(
          systemPrompt, userMessage, messages,
          { ...model, maxTokens: maxTok },
          temperature, globalController.signal, TIMEOUT_CONFIG.backup,
        );
        if (result) {
          resolved = true;
          resolve(result);
          return;
        }
      }

      resolve(null);
    });

    // ── Track Gemini (delayed start) ──
    const geminiDone = new Promise<{ content: string; modelId: string } | null>(async (resolve) => {
      // Wait for delay before starting Gemini (last resort)
      await sleep(TIMEOUT_CONFIG.geminiDelay);

      if (resolved || globalController.signal.aborted) {
        resolve(null);
        return;
      }

      tried.push('gemini-2.0-flash (احتياطي)');
      console.log(`[AI Core] Starting Gemini fallback after ${TIMEOUT_CONFIG.geminiDelay}ms delay...`);

      const geminiResult = await callGemini(systemPrompt, userMessage, messages, temperature, globalController.signal);
      if (geminiResult && !resolved) {
        resolved = true;
        resolve({ content: geminiResult, modelId: 'gemini-2.0-flash' });
        return;
      }

      resolve(null);
    });

    // ── Race: OpenRouter chain vs delayed Gemini ──
    const [orResult, geminiResult] = await Promise.all([orDone, geminiDone]);

    clearTimeout(globalTimer);

    // Prefer OpenRouter result (it finished first), else use Gemini
    if (orResult) {
      // Find which model produced the result
      const orModels = tried.filter(t => !t.includes('gemini'));
      const winningModelId = orModels[orModels.length - 1] || PRIMARY_MODEL.id;
      const model = ALL_MODELS.find(m => m.id === winningModelId) || PRIMARY_MODEL;
      return makeResult(orResult, model);
    }

    if (geminiResult) {
      return makeResult(geminiResult.content, {
        id: 'gemini-2.0-flash',
        label: 'Gemini 2.0 Flash (احتياطي)',
        tier: 0,
        maxTokens: 4096,
        contextWindow: 1_000_000,
      });
    }

    // Both failed
    return makeFailResult(globalController.signal.aborted);

  } catch (err) {
    clearTimeout(globalTimer);
    console.error('[AI Core] Fatal:', err);
    return makeFailResult(true);
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
  if (!OPENROUTER_KEY) {
    console.log(`[OpenRouter] No API key configured, skipping ${model.label}`);
    return null;
  }

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
      const elapsed = Date.now() - startMs;
      console.log(`[OpenRouter] ${model.label}: HTTP ${res.status} in ${elapsed}ms`);
      return null;
    }

    const data = await res.json();
    cleanup();

    const content = data?.choices?.[0]?.message?.content?.trim();
    const elapsed = Date.now() - startMs;

    if (content && content.length > 5) {
      console.log(`[OpenRouter] ✅ ${model.label}: ${content.length} chars in ${elapsed}ms`);
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
// 🔌 Gemini Call (Last Resort — with own dedicated timeout)
// ═══════════════════════════════════════════════════════════════════════════

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> | undefined,
  temperature: number,
  globalSignal: AbortSignal,
): Promise<string | null> {
  if (!GEMINI_KEY) {
    console.log(`[Gemini] No API key configured`);
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_CONFIG.geminiTimeout);
  const onGlobalAbort = () => controller.abort();
  globalSignal.addEventListener("abort", onGlobalAbort, { once: true });

  const cleanup = () => {
    clearTimeout(timer);
    globalSignal.removeEventListener("abort", onGlobalAbort);
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

    const startMs = Date.now();

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

    if (!res.ok) {
      cleanup();
      const elapsed = Date.now() - startMs;
      console.log(`[Gemini] HTTP ${res.status} in ${elapsed}ms`);
      return null;
    }

    const data = await res.json();
    cleanup();

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const elapsed = Date.now() - startMs;

    if (text && text.length > 5) {
      console.log(`[Gemini] ✅ ${text.length} chars in ${elapsed}ms`);
      return text;
    }

    console.log(`[Gemini] empty/short response in ${elapsed}ms`);
    return null;
  } catch (err) {
    cleanup();
    const reason = err instanceof Error && err.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
    console.log(`[Gemini] ${reason}`);
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
