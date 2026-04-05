import { NextResponse } from "next/server";
import { GEMINI_KEYS, ALL_MODELS } from "@/lib/ai-core";

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 AI Diagnostic — يعرض حالة OpenRouter + 4 مفاتيح Gemini + Groq
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

async function testGroq(key: string): Promise<{ ok: boolean; status: number; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
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

export async function GET() {
  const OR_KEY   = process.env.OPENROUTER_API_KEY;
  const GROQ_K   = process.env.GROQ_API_KEY;
  const timestamp = new Date().toISOString();

  // اختبار جميع المزودين بالتوازي
  const [orResult, groqResult, ...geminiResults] = await Promise.all([
    OR_KEY ? testOpenRouter(OR_KEY) : Promise.resolve({ ok: false, status: 0, latencyMs: 0, error: "KEY_MISSING" }),
    GROQ_K ? testGroq(GROQ_K) : Promise.resolve({ ok: false, status: 0, latencyMs: 0, error: "KEY_MISSING" }),
    // اختبار Gemini 2.5 Flash على جميع المفاتيح
    ...GEMINI_KEYS.map(k => testGemini(k, "gemini-2.5-flash-preview-04-17")),
    // اختبار Gemini 2.0 Flash على جميع المفاتيح
    ...GEMINI_KEYS.map(k => testGemini(k, "gemini-2.0-flash")),
  ]);

  const gemini25Results  = geminiResults.slice(0, GEMINI_KEYS.length);
  const gemini20Results  = geminiResults.slice(GEMINI_KEYS.length);

  const gemini25AnyOk = gemini25Results.some(r => r.ok);
  const gemini20AnyOk = gemini20Results.some(r => r.ok);

  const summary = {
    openrouter: {
      configured: !!OR_KEY,
      keyPreview: OR_KEY ? `${OR_KEY.slice(0, 8)}...${OR_KEY.slice(-4)}` : null,
      model: "qwen/qwen3.6-plus:free",
      ...orResult,
    },
    groq: {
      configured: !!GROQ_K,
      keyPreview: GROQ_K ? `${GROQ_K.slice(0, 8)}...${GROQ_K.slice(-4)}` : null,
      model: "llama-3.3-70b-versatile",
      ...groqResult,
    },
    gemini25Flash: {
      model: "gemini-2.5-flash-preview-04-17",
      totalKeys: GEMINI_KEYS.length,
      keys: GEMINI_KEYS.map((k, i) => ({
        index: i + 1,
        keyPreview: `${k.slice(0, 10)}...`,
        ...gemini25Results[i],
      })),
      workingKeys: gemini25Results.filter(r => r.ok).length,
    },
    gemini20Flash: {
      model: "gemini-2.0-flash",
      totalKeys: GEMINI_KEYS.length,
      keys: GEMINI_KEYS.map((k, i) => ({
        index: i + 1,
        keyPreview: `${k.slice(0, 10)}...`,
        ...gemini20Results[i],
      })),
      workingKeys: gemini20Results.filter(r => r.ok).length,
    },
    fallbackChain: ALL_MODELS.map((m, i) => {
      let status = "❌ FAIL";
      if (i === 0) status = orResult.ok ? "✅ OK" : "❌ FAIL";
      else if (i === 1) status = gemini25AnyOk ? `✅ ${gemini25Results.filter(r => r.ok).length}/${GEMINI_KEYS.length} keys OK` : "❌ ALL FAIL";
      else if (i === 2) status = gemini20AnyOk ? `✅ ${gemini20Results.filter(r => r.ok).length}/${GEMINI_KEYS.length} keys OK` : "❌ ALL FAIL";
      else if (i === 3) status = groqResult.ok ? "✅ OK" : "❌ FAIL";
      return { tier: i, provider: m.label, model: m.id, status };
    }),
    overallStatus: (orResult.ok || gemini25AnyOk || gemini20AnyOk || groqResult.ok)
      ? "🟢 OPERATIONAL"
      : "🔴 ALL DOWN",
  };

  return NextResponse.json({ timestamp, ...summary });
}
