"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
  reasoning?: string;
  modelLabel?: string;
  tier?: number;
  executionTime?: number;
}

interface AvailableModel {
  id: string;
  label: string;
  tier?: number;
}

const SUGGESTED_QUESTIONS = [
  "ما هو اختصاص المحاكم التجارية في الجزائر؟",
  "ما هي مواعيد الطعن بالاستئناف في المواد المدنية؟",
  "ما الفرق بين المحكمة الإدارية ومجلس الدولة؟",
  "كيف تحسب مدة التقادم في القانون المدني الجزائري؟",
  "ما هي إجراءات رفع دعوى الطلاق أمام المحكمة؟",
  "ما هو الاختصاص الإقليمي في دعاوى العقارات؟",
];

const TIER_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  2: { bg: "#eff6ff", text: "#1e40af", border: "#93c5fd" },
  3: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
};

const TIER_LABELS: Record<number, string> = {
  1: "🏆 Premium",
  2: "⚡ متقدم",
  3: "🔵 احتياطي",
};

export default function AiAssistant() {
  const [messages, setMessages]             = useState<Message[]>([]);
  const [input, setInput]                   = useState("");
  const [isLoading, setIsLoading]           = useState(false);
  const [copiedIdx, setCopiedIdx]           = useState<number | null>(null);
  const [models, setModels]                 = useState<AvailableModel[]>([]);
  const [selectedModel, setSelectedModel]   = useState("qwen/qwen3.6-plus:free");
  const [showReasoning, setShowReasoning]   = useState<number | null>(null);
  const [isExpanded, setIsExpanded]         = useState(false);
  const [statusMessage, setStatusMessage]   = useState("");
  const [elapsed, setElapsed]               = useState(0);
  const messagesEndRef                     = useRef<HTMLDivElement>(null);
  const inputRef                           = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef                   = useRef<HTMLDivElement>(null);
  const abortRef                           = useRef<AbortController | null>(null);
  const timerRef                           = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch available models on mount
  useEffect(() => {
    fetch("/api/ai")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (data.model) {
          setModels([{ id: data.model, label: data.label || "Qwen 3.6 Plus", tier: 0 }]);
          setSelectedModel(data.model);
        }
      })
      .catch(() => {});
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;

    const userMsg: Message = { role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setStatusMessage("جاري الاتصال...");
    startTimer();

    const clientController = new AbortController();
    abortRef.current = clientController;

    // Track what the backend told us, so we can show a specific error on disconnect
    let receivedStatusEvents = false;
    let lastStatusMsg = "";
    let clientTimeoutFired = false;

    // Client-side timeout: 32s (backend global is 28s + 4s buffer)
    const clientTimeout = setTimeout(() => {
      clientTimeoutFired = true;
      clientController.abort();
      stopTimer();
      setIsLoading(false);
      setStatusMessage("");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⏱️ تجاوز وقت الانتظار. يرجى المحاولة مرة أخرى.",
        timestamp: new Date(),
        error: true,
      }]);
    }, 32_000);

    // Helper: safely add an error message (idempotent)
    let errorMessageShown = false;
    const showErrorMessage = (content: string) => {
      if (errorMessageShown) return;
      errorMessageShown = true;
      stopTimer();
      setIsLoading(false);
      setStatusMessage("");
      setMessages(prev => [...prev, {
        role: "assistant",
        content,
        timestamp: new Date(),
        error: true,
      }]);
    };

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: msg,
          messages: messages.slice(-10),
          model: selectedModel === "auto" ? null : selectedModel,
        }),
        signal: clientController.signal,
      });

      clearTimeout(clientTimeout);

      if (!res.ok) {
        showErrorMessage(`❌ خطأ في الخادم (HTTP ${res.status}). يرجى المحاولة لاحقاً.`);
        return;
      }

      // ─── Read SSE stream ───
      const reader = res.body?.getReader();
      if (!reader) {
        showErrorMessage("❌ لم يتم تلقي أي بيانات من الخادم. يرجى المحاولة مرة أخرى.");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let streamSettled = false;

      // Helper to process a single SSE event
      function processSSEEvent(eventType: string, eventData: string) {
        if (!eventType || !eventData) return;
        try {
          const data = JSON.parse(eventData);

          if (eventType === "status") {
            receivedStatusEvents = true;
            lastStatusMsg = data.message || "";
            setStatusMessage(lastStatusMsg);
          } else if (eventType === "complete") {
            streamSettled = true;
            errorMessageShown = true; // prevent post-loop error message
            stopTimer();
            setIsLoading(false);
            setStatusMessage("");
            setMessages(prev => [...prev, {
              role: "assistant",
              content: data.reply,
              timestamp: new Date(),
              modelLabel: data.modelLabel,
              tier: data.tier,
              executionTime: data.executionTime,
            }]);
          } else if (eventType === "timeout") {
            streamSettled = true;
            showErrorMessage(`⏱️ ${data.error || "تجاوز وقت الانتظار. يرجى المحاولة مرة أخرى."}`);
          } else if (eventType === "error") {
            streamSettled = true;
            showErrorMessage(`❌ ${data.error || "حدث خطأ غير معروف"}`);
          }
        } catch {
          // Ignore malformed JSON
        }
      }

      // Helper to parse a chunk of SSE data
      function parseSSEChunk(chunk: string) {
        const lines = chunk.split("\n");
        let eventType = "";
        let eventData = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            eventData = line.slice(6).trim();
          } else if (line === "" && eventType && eventData) {
            processSSEEvent(eventType, eventData);
            eventType = "";
            eventData = "";
          }
        }

        // Handle unprocessed event data (stream ended without empty line)
        if (eventType && eventData) {
          processSSEEvent(eventType, eventData);
        }
      }

      // Read loop — handle both normal end and abrupt disconnect
      while (!streamSettled) {
        let readResult: ReadableStreamReadResult<Uint8Array>;
        try {
          readResult = await reader.read();
        } catch {
          // reader.read() threw — network disconnected mid-stream
          break;
        }
        const { done, value } = readResult;
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on double newlines to find complete SSE events
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          if (event.trim()) {
            parseSSEChunk(event);
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim() && !streamSettled) {
        parseSSEChunk(buffer);
      }

      // Stream ended without a terminal event → intelligent error based on context
      if (!streamSettled) {
        if (receivedStatusEvents) {
          // Backend was working (tried models) but connection dropped before final event
          showErrorMessage(
            "⚠️ تم الاتصال بالخادم لكن النماذج المجانية لم تُرجع رداً في الوقت المحدد. " +
            (lastStatusMsg ? `(آخر حالة: ${lastStatusMsg}) ` : "") +
            "يرجى المحاولة مرة أخرى."
          );
        } else {
          // No events at all — connection never established properly
          showErrorMessage("❌ انقطع الاتصال بالخادم قبل بدء التحليل. يرجى تحديث الصفحة والمحاولة مرة أخرى.");
        }
      }

    } catch (err) {
      clearTimeout(clientTimeout);

      if (clientTimeoutFired) {
        // Already handled by timeout handler
      } else if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled
      } else {
        showErrorMessage("❌ تعذّر الاتصال بالخادم. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.");
      }
    } finally {
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, selectedModel, startTimer, stopTimer]);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
    stopTimer();
    setIsLoading(false);
    setStatusMessage("");
  }, [stopTimer]);

  const copyMessage = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }, []);

  const shareWhatsApp = useCallback((text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const markdownComponents = {
    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) => (
      <h1 className="text-xl font-bold mt-4 mb-2" style={{ color: "#1a3a5c" }} {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) => (
      <h2 className="text-lg font-bold mt-4 mb-2" style={{ color: "#1a3a5c" }} {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) => (
      <h3 className="text-base font-bold mt-3 mb-1" style={{ color: "#1a3a5c" }} {...props}>{children}</h3>
    ),
    h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) => (
      <h4 className="text-sm font-bold mt-2 mb-1" style={{ color: "#1a3a5c" }} {...props}>{children}</h4>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { children?: React.ReactNode }) => (
      <p className="mt-2" {...props}>{children}</p>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement> & { children?: React.ReactNode }) => (
      <ul className="mr-4 list-disc space-y-1" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement> & { children?: React.ReactNode }) => (
      <ol className="mr-4 list-decimal space-y-1" {...props}>{children}</ol>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement> & { children?: React.ReactNode }) => (
      <li className="mr-4" {...props}>{children}</li>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => (
      <strong {...props}>{children}</strong>
    ),
    em: ({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => (
      <em {...props}>{children}</em>
    ),
    code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <pre className="mt-2 mb-2 p-2.5 rounded-lg overflow-x-auto text-[12px] leading-relaxed"
               style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
            <code className={className} {...props}>{children}</code>
          </pre>
        );
      }
      return (
        <code className="px-1 py-0.5 rounded text-[12px]"
              style={{ background: "#f1f5f9", color: "#1e293b" }} {...props}>{children}</code>
      );
    },
    pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement> & { children?: React.ReactNode }) => (
      <pre className="mt-2 mb-2 p-2.5 rounded-lg overflow-x-auto text-[12px] leading-relaxed"
           style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }} {...props}>{children}</pre>
    ),
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement> & { children?: React.ReactNode }) => (
      <blockquote className="mr-3 pr-3 mt-2 mb-2 border-r-2 italic text-[12px]"
                  style={{ borderColor: "#c9a84c", color: "#64748b" }} {...props}>{children}</blockquote>
    ),
    a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) => (
      <a href={href} target="_blank" rel="noopener noreferrer"
         style={{ color: "#1a3a5c" }} {...props}>{children}</a>
    ),
    hr: () => <hr className="my-3" style={{ borderColor: "#e2e8f0" }} />,
  };

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant" && !m.error);
  const currentTier = lastAssistantMsg?.tier || 0;

  // Floating button when collapsed
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full shadow-xl z-50 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #0f2540 0%, #1a3a5c 50%, #2d5a8a 100%)",
          boxShadow: "0 8px 32px rgba(26,58,92,0.4)",
        }}
        aria-label="فتح المساعد الذكي"
      >
        <span className="text-2xl">⚖️🤖</span>
        {currentTier > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center"
            style={{ background: currentTier === 1 ? "#10b981" : currentTier === 2 ? "#3b82f6" : "#f59e0b", color: "#fff" }}
          >
            {models.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
         style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl h-[90vh] sm:h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in"
           style={{ background: "#ffffff" }}>

        {/* Header */}
        <div className="p-3 sm:p-4 text-center flex-shrink-0 relative"
             style={{ background: "linear-gradient(135deg, #0f2540 0%, #1a3a5c 50%, #2d5a8a 100%)" }}>
          <button onClick={() => setIsExpanded(false)}
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white">
            ✕
          </button>
          <div className="text-2xl sm:text-3xl mb-0.5">⚖️🤖</div>
          <h1 className="text-lg sm:text-xl font-bold text-white">المساعد القانوني الذكي</h1>
          <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
            <span className="text-white/70 text-[10px] sm:text-xs">
              Qwen 3.6 Plus — مجاني ومفتوح المصدر
            </span>
            {lastAssistantMsg && (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: TIER_COLORS[lastAssistantMsg.tier || 3]?.bg, color: TIER_COLORS[lastAssistantMsg.tier || 3]?.text }}>
                {TIER_LABELS[lastAssistantMsg.tier || 3]} • {lastAssistantMsg.modelLabel}
              </span>
            )}
          </div>
        </div>

        {/* Model Badge */}
        <div className="px-3 py-1.5 border-b border-gray-100 flex-shrink-0 bg-gray-50 text-center">
          <span className="text-[10px] font-bold" style={{ color: "#15803d" }}>
            🧠 qwen/qwen3.6-plus:free
          </span>
        </div>

        {/* Chat Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4"
             style={{ background: "#ffffff" }}>

          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">⚖️</div>
              <h2 className="text-base font-bold mb-1" style={{ color: "#1a3a5c" }}>
                مرحباً بك في المساعد القانوني
              </h2>
              <p className="text-gray-400 text-xs mb-4">مدعوم بـ Qwen 3.6 Plus عبر OpenRouter</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-right">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)}
                    className="p-2.5 rounded-xl text-[11px] text-gray-600 transition-all text-right hover:shadow-md active:scale-[0.98]"
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[88%]">
                <div className={`flex items-end gap-1.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                       style={{
                         background: msg.role === "user" ? "#1a3a5c" : "#fef3c7",
                         color: msg.role === "user" ? "#fff" : "#92400e",
                       }}>
                    {msg.role === "user" ? "👤" : "⚖️"}
                  </div>

                  <div className="rounded-2xl px-3 py-2.5 shadow-sm"
                       style={{
                         borderRadius: msg.role === "user"
                           ? "14px 14px 4px 14px"
                           : "14px 14px 14px 4px",
                         background: msg.role === "user"
                           ? "#1a3a5c"
                           : msg.error ? "#fef2f2" : "#f8fafc",
                         color: msg.role === "user"
                           ? "#fff"
                           : msg.error ? "#991b1b" : "#1e293b",
                         border: msg.role === "assistant" && !msg.error
                           ? "1px solid #e2e8f0"
                           : "none",
                       }}>
                    {msg.role === "assistant" && !msg.error ? (
                      <div className="text-[13px] leading-relaxed" dir="rtl">
                        <ReactMarkdown components={markdownComponents}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-[13px] leading-relaxed" dir="rtl">{msg.content}</p>
                    )}

                    {msg.role === "assistant" && !msg.error && (
                      <div className="flex gap-2 mt-1.5 pt-1.5 flex-wrap" style={{ borderTop: "1px solid #f1f5f9" }}>
                        <button onClick={() => copyMessage(msg.content, idx)}
                          className="text-[10px] flex items-center gap-0.5 transition-colors"
                          style={{ color: copiedIdx === idx ? "#16a34a" : "#94a3b8" }}>
                          {copiedIdx === idx ? "✅ نُسخ" : "📋 نسخ"}
                        </button>
                        <button onClick={() => shareWhatsApp(msg.content)}
                          className="text-[10px] flex items-center gap-0.5 transition-colors"
                          style={{ color: "#94a3b8" }}>
                          📤 واتساب
                        </button>
                        {msg.reasoning && (
                          <button onClick={() => setShowReasoning(showReasoning === idx ? null : idx)}
                            className="text-[10px] flex items-center gap-0.5 transition-colors"
                            style={{ color: "#3b82f6" }}>
                            🧠 {showReasoning === idx ? "إخفاء التفكير" : "عرض التفكير"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reasoning Panel */}
                {msg.role === "assistant" && msg.reasoning && showReasoning === idx && (
                  <div className="mt-1 rounded-xl p-2.5 text-[11px] leading-relaxed mr-8"
                       style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af" }}
                       dir="rtl">
                    <p className="font-bold mb-1">🧠 عملية التفكير:</p>
                    <p className="whitespace-pre-wrap">{msg.reasoning}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className={`flex items-center gap-1.5 mt-0.5 ${msg.role === "user" ? "text-left" : "text-right"}`}>
                  <p className="text-[9px]" style={{ color: "#c0c0c0" }}>
                    {msg.timestamp.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
                    {msg.executionTime != null && ` • ${msg.executionTime}ms`}
                  </p>
                  {msg.role === "assistant" && !msg.error && msg.tier && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{
                            background: TIER_COLORS[msg.tier]?.bg,
                            color: TIER_COLORS[msg.tier]?.text,
                            border: `1px solid ${TIER_COLORS[msg.tier]?.border}`,
                          }}>
                      {TIER_LABELS[msg.tier]} • {msg.modelLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator with real-time status */}
          {isLoading && (
            <div className="flex justify-start mb-3">
              <div className="flex items-end gap-1.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                     style={{ background: "#fef3c7", color: "#92400e" }}>⚖️</div>
                <div className="rounded-2xl px-3 py-2.5"
                     style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px 14px 14px 4px" }}>
                  <div className="flex gap-1 items-center">
                    <span className="text-[10px] mr-1.5" style={{ color: "#94a3b8" }}>
                      {statusMessage || "🔄 يجرب أفضل نموذج..."}
                    </span>
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                           style={{ background: "#1a3a5c", animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px]" style={{ color: "#c0c0c0" }}>⏱️ {elapsed}s</span>
                    <button
                      onClick={cancelRequest}
                      className="text-[9px] px-1.5 py-0.5 rounded-full transition-colors"
                      style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }}
                    >
                      ✕ إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-2.5 sm:p-3 border-t border-gray-100 flex-shrink-0" style={{ background: "#fafafa" }}>
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اسأل عن أي موضوع قانوني جزائري..."
              rows={2}
              dir="rtl"
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl px-3 py-2.5 text-[13px] text-gray-700 transition-all disabled:opacity-50"
              style={{
                background: "#ffffff",
                border: "2px solid #e2e8f0",
                minHeight: 48,
                maxHeight: 100,
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#c9a84c"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="w-10 h-10 rounded-xl font-bold transition-all flex items-center justify-center flex-shrink-0 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isLoading || !input.trim() ? "#e2e8f0" : "linear-gradient(135deg, #c9a84c, #f0c040)",
                color: isLoading || !input.trim() ? "#94a3b8" : "#fff",
                boxShadow: isLoading || !input.trim() ? "none" : "0 4px 12px rgba(201,168,76,0.4)",
              }}
              aria-label="إرسال">
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[9px] text-center mt-1.5" style={{ color: "#c0c0c0" }}>
            Enter للإرسال • Shift+Enter لسطر جديد • للإرشاد فقط، استشر محامياً
          </p>
        </div>
      </div>
    </div>
  );
}
