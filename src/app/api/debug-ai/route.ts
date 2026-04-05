import { NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 AI Diagnostic Endpoint — Tests API keys and model availability
// ═══════════════════════════════════════════════════════════════════════════

export const maxDuration = 30;

export async function GET() {
  const OR_KEY = process.env.OPENROUTER_API_KEY;
  const GEM_KEY = process.env.GEMINI_API_KEY;
  const results: Record<string, unknown> = {};

  // ── Test OpenRouter ──
  if (OR_KEY) {
    const maskedKey = OR_KEY.slice(0, 8) + "..." + OR_KEY.slice(-4);
    results.openrouter = { keyConfigured: true, keyPreview: maskedKey };

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
      const body = await res.json().catch(() => ({}));
      results.openrouter.status = res.status;
      results.openrouter.response = {
        hasContent: !!(body?.choices?.[0]?.message?.content),
        content: body?.choices?.[0]?.message?.content || null,
        error: body?.error?.message || null,
        errorCode: body?.error?.code || null,
      };
    } catch (err) {
      results.openrouter.error = err instanceof Error ? err.message : "Unknown error";
    }
  } else {
    results.openrouter = { keyConfigured: false, note: "No OPENROUTER_API_KEY in Vercel env" };
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
    const body = await res.json().catch(() => ({}));
    results.gemini.status = res.status;
    results.gemini.response = {
      hasContent: !!(body?.candidates?.[0]?.content?.parts?.[0]?.text),
      text: body?.candidates?.[0]?.content?.parts?.[0]?.text || null,
      error: body?.error?.message || null,
    };
  } catch (err) {
    results.gemini.error = err instanceof Error ? err.message : "Unknown error";
  }

  return NextResponse.json({ timestamp: new Date().toISOString(), results });
}
