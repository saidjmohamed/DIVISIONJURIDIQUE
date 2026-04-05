import { NextResponse } from "next/server";
import { GEMINI_KEYS } from "@/lib/ai-core";

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 AI Diagnostic — يعرض حالة OpenRouter + 4 مفاتيح Gemini
// ═══════════════════════════════════════════════════════════════════════════

export const maxDuration = 30;

async function testOpenRouter(key: string): Promise<{ ok: boolean; status: number; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hiyaat-dz.vercel.app",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.6-plus:free",
        messages: [{ role: "user", content: "OK" }],
        max_tokens: 3,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const choices = body?.choices as Array<Record<string, unknown>> | undefined;
    const hasContent = !!(choices?.[0] as Record<string, unknown>)?.message;
    return { ok: res.ok && hasContent, status: res.status, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, status: 0, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : "Unknown" };
  }
}

async function testGemini(apiKey: string, model: string): Promise<{ ok: boolean; status: number; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "OK" }] }],
          generationConfig: { maxOutputTokens: 3 },
        }),
        signal: ctrl.signal,
      }
    );
    clearTimeout(timer);

    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const candidates = body?.candidates as Array<Record<string, unknown>> | undefined;
    const parts = ((candidates?.[0]?.content) as Record<string, unknown>)?.parts as Array<Record<string, unknown>> | undefined;
    const hasContent = !!parts?.[0]?.text;
    return { ok: res.ok && hasContent, status: res.status, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, status: 0, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : "Unknown" };
  }
}

export async function GET() {
  const OR_KEY = process.env.OPENROUTER_API_KEY;
  const timestamp = new Date().toISOString();

  // اختبار OpenRouter و 4 مفاتيح Gemini (2.5 Flash و 2.0 Flash) بالتوازي
  const [orResult, ...geminiResults] = await Promise.all([
    OR_KEY ? testOpenRouter(OR_KEY) : Promise.resolve({ ok: false, status: 0, latencyMs: 0, error: "KEY_MISSING" }),
    // اختبار Gemini 2.5 Flash على المفتاح الأول فقط
    testGemini(GEMINI_KEYS[0], "gemini-2.5-flash-preview-04-17"),
    // اختبار Gemini 2.0 Flash على كل المفاتيح
    ...GEMINI_KEYS.map(k => testGemini(k, "gemini-2.0-flash")),
  ]);

  const gemini25  = geminiResults[0];
  const gemini20s = geminiResults.slice(1);

  const summary = {
    openrouter: {
      configured: !!OR_KEY,
      keyPreview: OR_KEY ? `${OR_KEY.slice(0, 8)}...${OR_KEY.slice(-4)}` : null,
      model: "qwen/qwen3.6-plus:free",
      ...orResult,
    },
    gemini25Flash: {
      model: "gemini-2.5-flash-preview-04-17",
      keyPreview: GEMINI_KEYS[0] ? `${GEMINI_KEYS[0].slice(0, 10)}...` : null,
      ...gemini25,
    },
    gemini20Flash: {
      model: "gemini-2.0-flash",
      totalKeys: GEMINI_KEYS.length,
      keys: GEMINI_KEYS.map((k, i) => ({
        index: i + 1,
        keyPreview: `${k.slice(0, 10)}...`,
        ...gemini20s[i],
      })),
      workingKeys: gemini20s.filter(r => r.ok).length,
    },
    fallbackChain: [
      { tier: 0, provider: "OpenRouter",         model: "qwen/qwen3.6-plus:free",              status: orResult.ok ? "✅ OK" : "❌ FAIL" },
      { tier: 1, provider: "Gemini 2.5 Flash",   model: "gemini-2.5-flash-preview-04-17",       status: gemini25.ok ? "✅ OK" : "❌ FAIL" },
      { tier: 2, provider: "Gemini 2.0 Flash",   model: "gemini-2.0-flash (×4 keys)",           status: gemini20s.some(r => r.ok) ? `✅ ${gemini20s.filter(r => r.ok).length}/4 keys OK` : "❌ ALL FAIL" },
    ],
    overallStatus: (orResult.ok || gemini25.ok || gemini20s.some(r => r.ok)) ? "🟢 OPERATIONAL" : "🔴 ALL DOWN",
  };

  return NextResponse.json({ timestamp, ...summary });
}
