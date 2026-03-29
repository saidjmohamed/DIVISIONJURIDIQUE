'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
} from 'lucide-react';

interface HelpMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
}

const faqQuestions = [
  'كيف أستخدم المساعد الذكي؟',
  'كيف أرفع ملف PDF؟',
  'كيف أستخدم أدوات PDF؟',
  'كيف أجتاز الاختبار؟',
  'ما هي ميزات التطبيق؟',
];

export default function AppGuideBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: HelpMessage = {
      id: `help-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });

      const data = await response.json();

      const botMsg: HelpMessage = {
        id: `help-${Date.now()}-resp`,
        role: 'bot',
        content: data.response || 'عذراً، لم أتمكن من الإجابة حالياً.',
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errMsg: HelpMessage = {
        id: `help-${Date.now()}-err`,
        role: 'bot',
        content: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى. 🙏',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 animate-pulse-gentle"
        aria-label="مساعد التطبيق"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <MessageCircle className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-36 left-4 z-50 flex h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl animate-slide-up">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20">
                <Bot className="h-4 w-4 text-sky-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  مساعد التطبيق 🤖
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  كيف يمكنني مساعدتك؟
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* FAQ Quick Actions (show only when no messages) */}
          {messages.length === 0 && (
            <div className="shrink-0 border-b border-white/5 px-4 py-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                أسئلة شائعة
              </p>
              <div className="flex flex-wrap gap-1.5">
                {faqQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-medium text-sky-400 transition-colors hover:bg-sky-500/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10">
                  <Bot className="h-6 w-6 text-sky-400" />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  اطرح سؤالك أو اختر من الأسئلة الشائعة
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 animate-fade-in ${
                      msg.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        msg.role === 'user'
                          ? 'bg-sky-500/20'
                          : 'bg-sky-500/10'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="h-3 w-3 text-sky-400" />
                      ) : (
                        <Bot className="h-3 w-3 text-sky-400" />
                      )}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-sky-500/15 text-foreground'
                          : 'glass text-foreground'
                      }`}
                    >
                      <div className="prose prose-xs max-w-none prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2 animate-fade-in">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/10">
                      <Bot className="h-3 w-3 text-sky-400" />
                    </div>
                    <div className="glass rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin text-sky-400" />
                        <span className="text-[11px] text-muted-foreground">
                          جارٍ التفكير...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-white/5 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="اكتب سؤالك..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sky-500/50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white transition-colors hover:bg-sky-600 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
