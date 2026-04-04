/**
 * Hook مشترك: نسخ إلى الحافظة
 * يُستخدم في 7+ أدوات — يمنع تكرار الكود
 */
'use client';

import { useState, useCallback } from 'react';

export function useCopyToClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
    }).catch(() => {});
  }, [resetDelay]);

  return { copied, copy };
}
