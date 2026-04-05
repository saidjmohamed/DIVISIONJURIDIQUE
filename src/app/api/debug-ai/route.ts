import { NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 AI Diagnostic Endpoint — Tests API keys and model availability
// ═══════════════════════════════════════════════════════════════════════════

export const maxDuration = 30;

interface TestResult {
  keyConfigured: boolean;
  keyPreview?: string;
  status?: number;
  response?: {
    hasContent: boolean;
    content: string | null;
    error: string | null;
    errorCode?: string | null;
  };
  error?: string;
  note?: string;
  keyHasFallback?: boolean;
}

export async function GET() {
  const OR_KEY = process.env.OPENROUTER_API_KEY;
  const GEM_KEY = process.env.GEMINI_API_KEY;
  const results: { openrouter: TestResult; gemini: TestResult } = {
    openrouter: { keyConfigured: false },
    gemini: { keyConfigured: false },
  };

  // ── Test OpenRouter ──
  if (OR_KEY) {
    results.openrouter = {
      keyConfigured: true,
      keyPreview: OR_KEY.slice(0, 8) + "..." + OR_KEY.slice(-4),
    };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OR_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://hiyaat-dz.vercel.app",
        },
        body: JSON.stringify({
          model: "qwen/qwen3.6-plus:free",
          messages: [{ role: "user", content: "Say OK" }],
          max_tokens: 5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      results.openrouter.status = res.status;
      const choices = body?.choices as Array<Record<string, unknown>> | undefined;
      const errMsg = body?.error as Record<string, unknown> | undefined;
      results.openrouter.response = {
        hasContent: !!(choices?.[0]?.message as Record<string, unknown>)?.content,
        content: String(((choices?.[0]?.message as Record<string, unknown>)?.content) || ""),
        error: errMsg?.message ? String(errMsg.message) : null,
        errorCode: errMsg?.code ? String(errMsg.code) : null,
      };
    } catch (err) {
      results.openrouter.error = err instanceof Error ? err.message : "Unknown error";
    }
  } else {
    results.openrouter.note = "No OPENROUTER_API_KEY in Vercel env vars";
  }

  // ── Test Gemini ──
  const effectiveGemKey = GEM_KEY || "AIzaSyDLlsNaQFMrGgBlyFRdAQAjwDwYh_m4wiM";
  results.gemini = { keyConfigured: !!GEM_KEY, keyHasFallback: !GEM_KEY };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": effectiveGemKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Say OK" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timer);
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    results.gemini.status = res.status;
    const candidates = body?.candidates as Array<Record<string, unknown>> | undefined;
    const errMsg = body?.error as Record<string, unknown> | undefined;
    const parts = ((candidates?.[0]?.content) as Record<string, unknown>)?.parts as Array<Record<string, unknown>> | undefined;
    results.gemini.response = {
      hasContent: !!parts?.[0]?.text,
      content: String(parts?.[0]?.text || ""),
      error: errMsg?.message ? String(errMsg.message) : null,
    };
  } catch (err) {
    results.gemini.error = err instanceof Error ? err.message : "Unknown error";
  }

  return NextResponse.json({ timestamp: new Date().toISOString(), results });
}
