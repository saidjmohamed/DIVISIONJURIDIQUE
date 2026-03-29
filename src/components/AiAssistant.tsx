"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "ما هو اختصاص المحاكم التجارية في الجزائر؟",
  "ما هي مواعيد الطعن بالاستئناف في المواد المدنية؟",
  "ما الفرق بين المحكمة الإدارية ومجلس الدولة؟",
  "كيف تحسب مدة التقادم في القانون المدني الجزائري؟",
  "ما هي إجراءات رفع دعوى الطلاق أمام المحكمة؟",
  "ما هو الاختصاص الإقليمي في دعاوى العقارات؟",
];

export default function AiAssistant() {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [copiedIdx, setCopiedIdx]   = useState<number | null>(null);
  const messagesEndRef               = useRef<HTMLDivElement>(null);
  const inputRef                     = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;

    const userMsg: Message = { role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/gemini", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          userMessage: msg,
          messages: messages.slice(-10),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages(prev => [...prev, {
          role:      "assistant",
          content:   `❌ خطأ: ${data.error ?? "خطأ غير معروف"}`,
          timestamp: new Date(),
          error:     true,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role:      "assistant",
          content:   data.reply,
          timestamp: new Date(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role:      "assistant",
        content:   "❌ تعذّر الاتصال بالخادم. تأكد من الاتصال بالإنترنت.",
        timestamp: new Date(),
        error:     true,
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages]);

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

  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g,     "<em>$1</em>")
      .replace(/^### (.*)/gm,    '<h3 class="text-base font-bold mt-3 mb-1" style="color:#1a3a5c">$1</h3>')
      .replace(/^## (.*)/gm,     '<h2 class="text-lg font-bold mt-4 mb-2" style="color:#1a3a5c">$1</h2>')
      .replace(/^(\d+)\. (.*)/gm,'<li class="mr-4 list-decimal">$2</li>')
      .replace(/^- (.*)/gm,      '<li class="mr-4 list-disc">$1</li>')
      .replace(/\n\n/g,           '</p><p class="mt-2">')
      .replace(/\n/g,             "<br/>");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 animate-fade-in flex flex-col"
         style={{ height: "calc(100vh - 140px)", minHeight: 400 }}>

      {/* Header */}
      <div className="rounded-2xl p-4 mb-4 text-center shadow-lg"
           style={{ background: "linear-gradient(135deg, #0f2540 0%, #1a3a5c 50%, #2d5a8a 100%)" }}>
        <div className="text-3xl mb-1">⚖️🤖</div>
        <h1 className="text-xl font-bold text-white">المساعد القانوني الذكي</h1>
        <p className="text-white/70 text-xs mt-1">مدعوم بـ Gemini 2.5 Flash — متخصص في القانون الجزائري</p>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto rounded-2xl shadow-inner p-4 mb-4"
           style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>

        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">⚖️</div>
            <h2 className="text-lg font-bold mb-2" style={{ color: "#1a3a5c" }}>
              مرحباً بك في المساعد القانوني
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              اسألني عن أي موضوع قانوني جزائري
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)}
                  className="p-3 rounded-xl text-sm text-gray-700 transition-all text-right"
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] ${msg.role === "user" ? "order-1" : "order-2"}`}>
              <div className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                     style={{
                       background: msg.role === "user"
                         ? "#1a3a5c" : "#fef3c7",
                       color: msg.role === "user" ? "#fff" : "#92400e",
                     }}>
                  {msg.role === "user" ? "👤" : "⚖️"}
                </div>

                <div className="rounded-2xl px-4 py-3 shadow-sm"
                     style={{
                       borderRadius: msg.role === "user"
                         ? "16px 16px 4px 16px"
                         : "16px 16px 16px 4px",
                       background: msg.role === "user"
                         ? "#1a3a5c"
                         : msg.error
                           ? "#fef2f2"
                           : "#f8fafc",
                       color: msg.role === "user"
                         ? "#fff"
                         : msg.error
                           ? "#991b1b"
                           : "#1e293b",
                       border: msg.role === "assistant" && !msg.error
                         ? "1px solid #e2e8f0"
                         : msg.error
                           ? "1px solid #fecaca"
                           : "none",
                     }}>
                  {msg.role === "assistant" && !msg.error ? (
                    <div className="text-sm leading-relaxed"
                         dir="rtl"
                         dangerouslySetInnerHTML={{ __html: formatText(msg.content) }} />
                  ) : (
                    <p className="text-sm leading-relaxed" dir="rtl">{msg.content}</p>
                  )}

                  {msg.role === "assistant" && !msg.error && (
                    <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: "1px solid #f1f5f9" }}>
                      <button onClick={() => copyMessage(msg.content, idx)}
                        className="text-xs flex items-center gap-1 transition-colors"
                        style={{ color: copiedIdx === idx ? "#16a34a" : "#94a3b8" }}>
                        {copiedIdx === idx ? "✅ نُسخ" : "📋 نسخ"}
                      </button>
                      <button onClick={() => shareWhatsApp(msg.content)}
                        className="text-xs flex items-center gap-1 transition-colors"
                        style={{ color: "#94a3b8" }}>
                        📤 واتساب
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className={`text-xs mt-1 ${msg.role === "user" ? "text-left" : "text-right"}`}
                 style={{ color: "#94a3b8" }}>
                {msg.timestamp.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                   style={{ background: "#fef3c7", color: "#92400e" }}>⚖️</div>
              <div className="rounded-2xl px-4 py-3"
                   style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px 16px 16px 4px" }}>
                <div className="flex gap-1 items-center">
                  <span className="text-xs mr-2" style={{ color: "#94a3b8" }}>يفكر...</span>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                         style={{ background: "#1a3a5c", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* منطقة الإدخال */}
      <div className="rounded-2xl shadow-md p-3" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
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
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm text-gray-700 transition-all disabled:opacity-50"
            style={{
              background: "#f8fafc",
              border: "2px solid transparent",
              minHeight: 56,
              maxHeight: 120,
              outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#c9a84c"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="w-12 h-12 rounded-xl font-bold transition-all flex items-center justify-center flex-shrink-0 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isLoading || !input.trim() ? "#e2e8f0" : "linear-gradient(135deg, #c9a84c, #f0c040)",
              color: isLoading || !input.trim() ? "#94a3b8" : "#fff",
              boxShadow: isLoading || !input.trim() ? "none" : "0 4px 12px rgba(201,168,76,0.4)",
            }}
            aria-label="إرسال">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-center mt-2" style={{ color: "#94a3b8" }}>
          Enter للإرسال • Shift+Enter لسطر جديد • للإرشاد فقط، استشر محامياً
        </p>
      </div>
    </div>
  );
}
