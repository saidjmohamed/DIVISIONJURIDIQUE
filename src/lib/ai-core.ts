/**
 * AI Core — محرك الذكاء الاصطناعي الموحد
 *
 * يُوفر منطقاً مشتركاً لكل الأدوات التي تستخدم AI:
 * - petition-check (الفحص الشكلي)
 * - contract-review (فحص العقود) — مستقبلاً
 * - judgment-analyzer (تحليل الأحكام) — مستقبلاً
 *
 * يشارك: retry logic, model fallback, rate limiting, JSON parsing
 */

import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ─── Model Configuration ───────────────────────────────────

interface AIModel {
  id: string;
  label: string;
  tier: number;
  maxTokens: number;
}

export const AI_MODELS: AIModel[] = [
  { id: "qwen/qwen3.6-plus:free",                 label: "Qwen 3.6 Plus",        tier: 0, maxTokens: 8192 },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free",    label: "Nemotron Nano 30B",    tier: 1, maxTokens: 4096 },
  { id: "openai/gpt-oss-20b:free",                label: "GPT OSS 20B",           tier: 1, maxTokens: 4096 },
  { id: "arcee-ai/trinity-mini:free",             label: "Trinity Mini",          tier: 1, maxTokens: 4096 },
  { id: "stepfun/step-3.5-flash:free",            label: "Step 3.5 Flash",        tier: 1, maxTokens: 4096 },
  { id: "openai/gpt-oss-120b:free",               label: "GPT OSS 120B",          tier: 2, maxTokens: 6144 },
  { id: "qwen/qwen3-coder:free",                  label: "Qwen3 Coder",           tier: 2, maxTokens: 6144 },
  { id: "google/gemma-3-27b-it:free",             label: "Gemma 3 27B",           tier: 3, maxTokens: 4096 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B",        tier: 3, maxTokens: 4096 },
  { id: "minimax/minimax-m2.5:free",              label: "MiniMax M2.5",          tier: 3, maxTokens: 4096 },
];

// ─── Rate Limiting Helper ─────────────────────────────────

export interface RateLimitConfig {
  key: string;
  limit: number;
  window: number; // seconds
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

interface AICallOptions {
  systemPrompt: string;
  userMessage: string;
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Temperature (default: 0.2) */
  temperature?: number;
  /** Timeout per model in ms (default: 25000) */
  timeout?: number;
  /** Number of retry attempts on Tier 0 if parsing fails (default: 0) */
  retries?: number;
  /** Custom retry message to append */
  retryMessage?: string;
  /** Only try models up to this tier */
  maxTier?: number;
}

interface AIResult {
  content: string;
  model: AIModel;
  triedModels: string[];
}

export async function callAI(options: AICallOptions): Promise<AIResult | null> {
  if (!OPENROUTER_KEY) return null;

  const {
    systemPrompt,
    userMessage,
    temperature = 0.2,
    timeout = 25000,
    retries = 0,
    retryMessage,
    maxTier = 3,
  } = options;

  const tried: string[] = [];

  for (const model of AI_MODELS) {
    if (model.tier > maxTier) continue;
    tried.push(model.id);

    const maxTok = options.maxTokens || model.maxTokens;

    // First attempt
    const result = await callSingleModel(systemPrompt, userMessage, model, maxTok, temperature, timeout);
    if (result) {
      return { content: result, model, triedModels: tried };
    }

    // Retry on Tier 0
    if (model.tier === 0 && retries > 0) {
      const retryMsg = userMessage + (retryMessage || "\n\n⚠️ تنبيه: ردك السابق لم يكن بالصيغة المطلوبة. حاول مرة أخرى.");
      const retryResult = await callSingleModel(systemPrompt, retryMsg, model, maxTok, temperature, timeout * 1.5);
      if (retryResult) {
        return { content: retryResult, model, triedModels: tried };
      }
    }
  }

  return null; // All models failed
}

async function callSingleModel(
  systemPrompt: string,
  userMessage: string,
  model: AIModel,
  maxTokens: number,
  temperature: number,
  timeout: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

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
    clearTimeout(timer);

    if (!res.ok) return null;

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    return content && content.length > 20 ? content : null;
  } catch {
    clearTimeout(timer);
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

  // Find outermost balanced {...}
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

  // Try fixing truncated JSON
  if (start !== -1) {
    let truncated = trimmed.substring(start);
    const openB = (truncated.match(/\{/g) || []).length;
    const closeB = (truncated.match(/\}/g) || []).length;
    const openBr = (truncated.match(/\[/g) || []).length;
    const closeBr = (truncated.match(/\]/g) || []).length;
    truncated = truncated.replace(/,\s*"[^"]*"\s*:?\s*$/, '');
    truncated = truncated.replace(/,\s*$/, '');
    truncated += ']'.repeat(Math.max(0, openBr - closeBr));
    truncated += '}'.repeat(Math.max(0, openB - closeB));
    try { JSON.parse(truncated); return truncated; } catch {}
  }

  return null;
}

export function parseJSON<T = Record<string, unknown>>(raw: string): T | null {
  const jsonStr = extractJSON(raw);
  if (!jsonStr) return null;
  try { return JSON.parse(jsonStr) as T; } catch { return null; }
}
