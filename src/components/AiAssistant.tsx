'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Copy,
  Share2,
  Brain,
  User,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  'ما هي حقوق الموظف في القانون الجزائري؟',
  'كيف يتم تقديم شكوى جنائية؟',
  'ما الفرق بين العقد الشفوي والمكتوب؟',
  'شرح قانون الأسرة الجزائري',
  'حقوق المستأجر وفق القانون الجزائري',
  'كيف يتم تسجيل شركة في الجزائر؟',
];

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('تم النسخ');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('فشل في النسخ');
    }
  };

  const shareViaWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في الحصول على رد');
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-resp`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content:
          'عذراً، حدث خطأ في الاتصال. يرجى التأكد من إعدادات API والمحاولة مرة أخرى. 🙏',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="animate-fade-in shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-md">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">المساعد الذكي 🧠</h2>
            <p className="text-xs text-muted-foreground">
              اسألني أي سؤال حول القانون الجزائري
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-2">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 pb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-sky-500/20">
              <Brain className="h-8 w-8 text-purple-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-foreground">
                المساعد الذكي جاهز
              </p>
              <p className="text-xs text-muted-foreground">
                اختر سؤالاً أو اكتب سؤالك الخاص
              </p>
            </div>

            {/* Suggested Questions */}
            <div className="grid w-full max-w-md grid-cols-1 gap-2">
              {suggestedQuestions.map((q, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(q)}
                  className="glass group flex items-center gap-2 rounded-xl p-3 text-right transition-all duration-200 hover:bg-white/10 active:scale-[0.98] animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/10">
                    <span className="text-xs text-sky-400">{index + 1}</span>
                  </div>
                  <span className="text-xs text-foreground/80 line-clamp-2">
                    {q}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 animate-fade-in ${
                  msg.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    msg.role === 'user'
                      ? 'bg-sky-500/20'
                      : 'bg-purple-500/20'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4 text-sky-400" />
                  ) : (
                    <Brain className="h-4 w-4 text-purple-400" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-sky-500/15 text-foreground'
                      : 'glass text-foreground'
                  }`}
                >
                  <div className="prose prose-sm max-w-none prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>

                  {/* Message Actions */}
                  {msg.role === 'assistant' && (
                    <div className="mt-2 flex items-center gap-1 border-t border-white/5 pt-2">
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <CheckCheck className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            نسخ
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => shareViaWhatsApp(msg.content)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                      >
                        <Share2 className="h-3 w-3" />
                        مشاركة
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 animate-fade-in">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                  <Brain className="h-4 w-4 text-purple-400" />
                </div>
                <div className="glass rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-sky-400 animate-typing-dot" />
                    <div className="h-2 w-2 rounded-full bg-sky-400 animate-typing-dot-delay-1" />
                    <div className="h-2 w-2 rounded-full bg-sky-400 animate-typing-dot-delay-2" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-white/5 bg-background/80 backdrop-blur-sm px-4 py-3 safe-bottom">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              placeholder="اكتب سؤالك القانوني..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="min-h-[44px] max-h-[120px] resize-none rounded-xl text-right text-sm"
              rows={1}
            />
          </div>
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="h-[44px] w-[44px] shrink-0 rounded-xl bg-sky-500 p-0 hover:bg-sky-600 disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
