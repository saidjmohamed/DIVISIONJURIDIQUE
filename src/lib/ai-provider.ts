/**
 * AI Provider — Gemini + OpenRouter (fallback)
 * يدعم Gemini كمزود أساسي و OpenRouter كبديل مجاني
 */

/* ─────────────────────── Configuration ─────────────────────── */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const GEMINI_MODEL = "models/gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// أفضل النماذج المجانية على OpenRouter
const OPENROUTER_MODELS = {
  reasoning: "deepseek/deepseek-r1:free",           // أقوى نموذج للتحليل والتفكير
  general: "meta-llama/llama-3.3-70b-instruct:free", // ممتاز للصياغة والإجابات العامة
  fast: "google/gemini-2.0-flash-exp:free",           // سريع جداً مع سياق كبير
  vision: "qwen/qwen2.5-vl-72b-instruct:free",       // يدعم قراءة الصور والمستندات
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type AITask = "analysis" | "drafting" | "research" | "general";

/* ─────────────────────── Gemini Call ─────────────────────── */

interface GeminiPart {
  text?: string;
  thought?: boolean;
  inline_data?: { mime_type: string; data: string };
}

async function callGemini(
  systemPrompt: string,
  userParts: GeminiPart[],
  jsonMode: boolean = true
): Promise<{ text: string; provider: string }> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_KEY_MISSING");

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: userParts }],
    generationConfig: {
      temperature: 0.2,
      topK: 20,
      topP: 0.9,
      maxOutputTokens: 8192,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    ],
  };

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ??
        `Gemini HTTP ${response.status}`
    );
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];

  // Handle thinking mode — get non-thought part
  let rawText = "";
  for (const part of parts) {
    if (part.text && !part.thought) {
      rawText = part.text;
    }
  }
  if (!rawText && parts.length > 0) {
    rawText = parts[parts.length - 1]?.text ?? parts[0]?.text ?? "";
  }

  if (!rawText) throw new Error("GEMINI_EMPTY_RESPONSE");

  return { text: rawText, provider: "gemini" };
}

/* ─────────────────────── OpenRouter Call ─────────────────────── */

function pickOpenRouterModel(task: AITask): string {
  switch (task) {
    case "analysis": return OPENROUTER_MODELS.reasoning;
    case "drafting": return OPENROUTER_MODELS.general;
    case "research": return OPENROUTER_MODELS.reasoning;
    default: return OPENROUTER_MODELS.general;
  }
}

async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  task: AITask = "general",
  jsonMode: boolean = true
): Promise<{ text: string; provider: string; model: string }> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_KEY_MISSING");

  const model = pickOpenRouterModel(task);

  const body = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
    max_tokens: 8192,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  };

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://shamil-law.vercel.app",
      "X-Title": "الشامل - المنصة القانونية الذكية",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ??
        `OpenRouter HTTP ${response.status}`
    );
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content ?? "";

  if (!rawText) throw new Error("OPENROUTER_EMPTY_RESPONSE");

  return { text: rawText, provider: "openrouter", model };
}

/* ─────────────────────── Main: Gemini + OpenRouter Fallback ─────────────────────── */

export interface AICallOptions {
  systemPrompt: string;
  userMessage: string;
  pdfBase64?: string;
  task?: AITask;
  jsonMode?: boolean;
}

export interface AICallResult {
  text: string;
  provider: string;
  model?: string;
}

/**
 * يستدعي Gemini أولاً. إذا فشل، يحاول OpenRouter.
 * لملفات PDF: يستخدم Gemini فقط (يدعم inline_data).
 * للنصوص: يستخدم Gemini ثم OpenRouter كبديل.
 */
export async function callAI(options: AICallOptions): Promise<AICallResult> {
  const { systemPrompt, userMessage, pdfBase64, task = "general", jsonMode = true } = options;

  // If PDF is provided, Gemini is the primary (supports inline_data)
  if (pdfBase64) {
    try {
      const userParts: GeminiPart[] = [
        { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
        { text: userMessage },
      ];
      return await callGemini(systemPrompt, userParts, jsonMode);
    } catch (geminiErr) {
      console.error("Gemini failed with PDF:", geminiErr);
      // For PDF, try OpenRouter without the PDF (text-only fallback won't work well)
      // So we throw a user-friendly error
      throw new Error("فشل تحليل ملف PDF. يرجى المحاولة بملف أصغر أو بصيغة DOCX.");
    }
  }

  // Text-based: try Gemini first, fallback to OpenRouter
  const errors: string[] = [];

  // 1. Try Gemini
  if (GEMINI_API_KEY) {
    try {
      const userParts: GeminiPart[] = [{ text: userMessage }];
      return await callGemini(systemPrompt, userParts, jsonMode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Gemini failed:", msg);
      errors.push(`Gemini: ${msg}`);
    }
  }

  // 2. Try OpenRouter
  if (OPENROUTER_API_KEY) {
    try {
      return await callOpenRouter(systemPrompt, userMessage, task, jsonMode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("OpenRouter failed:", msg);
      errors.push(`OpenRouter: ${msg}`);
    }
  }

  // Both failed
  throw new Error(
    `فشل الاتصال بخدمات التحليل. ${errors.join(" | ")}`
  );
}

/* ─────────────────────── JSON Parsing Helper ─────────────────────── */

export function parseAIJson(raw: string): unknown {
  let cleaned = raw.trim();

  // Remove markdown wrapping
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");

  // Extract JSON object
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  return JSON.parse(cleaned);
}
