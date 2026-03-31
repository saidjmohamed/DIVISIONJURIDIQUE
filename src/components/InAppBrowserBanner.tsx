"use client";

import { useState, useEffect } from "react";
import { ExternalLink, X, Smartphone, Copy, Check } from "lucide-react";

function getIsInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || (navigator as any).vendor || "";
  return /FBAN|FBAV|Instagram|Messenger|TikTok|Snapchat|Twitter|Line|WhatsApp|MicroMessenger|UCBrowser.*wv|; wv\)/i.test(ua);
}

function getIsIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function InAppBrowserBanner() {
  const [visible, setVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (getIsInAppBrowser() && !sessionStorage.getItem("inapp-banner-dismissed")) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const isIOS = getIsIOS();

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem("inapp-banner-dismissed", "1");
  };

  const handleOpenInBrowser = () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    // Android: try intent:// to open in Chrome
    const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;

    // Fallback: after a short delay, try window.open
    setTimeout(() => {
      window.open(currentUrl, "_system");
    }, 1500);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for clipboard API not available
      const textArea = document.createElement("textarea");
      textArea.value = currentUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-in slide-in-from-bottom duration-500">
      <div className="mx-3 mb-3 rounded-2xl border border-[var(--gold)]/30 bg-[var(--bg-card)] shadow-lg overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 bg-gradient-to-l from-[var(--navy)] to-[var(--navy-dark)] px-4 py-2.5">
          <div className="flex items-center gap-2 text-white">
            <Smartphone className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">فتح في المتصفح</span>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {!showIOSInstructions ? (
            <>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] mb-3">
                للحصول على تجربة أفضل وتثبيت التطبيق، افتح الرابط في المتصفح الخارجي
                {isIOS ? " (سفاري)" : " (كروم)"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleOpenInBrowser}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[var(--navy)] to-[var(--navy-light)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>{isIOS ? "كيفية الفتح في سفاري" : "فتح في كروم"}</span>
                </button>
                <button
                  onClick={handleCopyUrl}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[var(--navy)]/20 bg-[var(--bg-subtle)] px-4 py-2.5 text-sm font-medium text-[var(--navy)] transition-all hover:bg-[var(--navy)]/5 active:scale-[0.98]"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? "تم النسخ!" : "نسخ الرابط"}</span>
                </button>
              </div>
            </>
          ) : (
            /* iOS Instructions */
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                لفتح الرابط في سفاري:
              </p>
              <ol className="space-y-2 text-sm text-[var(--text-secondary)] list-none pr-0">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-[10px] font-bold text-white">1</span>
                  <span>اضغط على أيقونة <strong>⋯</strong> (ثلاث نقاط) أو أيقونة المشاركة في الأسفل</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-[10px] font-bold text-white">2</span>
                  <span>اختر <strong>&quot;فتح في سفاري&quot;</strong> أو <strong>&quot;Open in Safari&quot;</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-[10px] font-bold text-white">3</span>
                  <span>بعد الفتح في سفاري، اضغط على أيقونة المشاركة ثم <strong>&quot;إضافة إلى الشاشة الرئيسية&quot;</strong></span>
                </li>
              </ol>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="flex flex-1 items-center justify-center rounded-xl border border-[var(--navy)]/20 bg-[var(--bg-subtle)] px-4 py-2.5 text-sm font-medium text-[var(--navy)] transition-all hover:bg-[var(--navy)]/5"
                >
                  رجوع
                </button>
                <button
                  onClick={handleCopyUrl}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[var(--navy)] to-[var(--navy-light)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? "تم النسخ!" : "نسخ الرابط"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
