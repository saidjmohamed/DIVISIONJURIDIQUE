/**
 * Hook مشترك: تحليل الملفات (رفع + استخراج نص + تقدم وهمي)
 * يُستخدم في SmartPetitionChecker, ContractReviewer, JudgmentAnalyzer
 */
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import { extractTextFromFile } from '@/lib/extract-text';

interface UseFileAnalysisOptions {
  /** Accepted file types (MIME) */
  accept?: Accept;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Error message for invalid file type */
  invalidTypeError?: string;
  /** Progress step labels */
  progressSteps?: string[];
}

export function useFileAnalysis(options: UseFileAnalysisOptions = {}) {
  const {
    accept = {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/pdf': ['.pdf'],
    },
    maxSize = 10 * 1024 * 1024,
    progressSteps = [
      'جاري قراءة الملف...',
      'استخراج النص...',
      'تحليل المحتوى...',
      'إعداد النتائج...',
    ],
  } = options;

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  function startProgress() {
    setProgressStep(0);
    let step = 0;
    progressInterval.current = setInterval(() => {
      step++;
      if (step < progressSteps.length) setProgressStep(step);
    }, 800);
  }

  function stopProgress() {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }

  useEffect(() => {
    return () => { stopProgress(); };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const f = acceptedFiles[0];
    if (!f) return;

    if (f.size > maxSize) {
      setError('حجم الملف يتجاوز الحد المسموح');
      return;
    }
    setFile(f);
  }, [maxSize]);

  const dropzone = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    multiple: false,
  });

  function reset() {
    setFile(null);
    setLoading(false);
    setError(null);
    setProgressStep(0);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
  }

  async function extractText(): Promise<string> {
    if (!file) throw new Error('لم يتم اختيار ملف');
    const text = await extractTextFromFile(file);
    if (!text.trim()) {
      throw new Error('لم يتم استخراج أي نص من المستند');
    }
    return text;
  }

  return {
    file, setFile,
    loading, setLoading,
    error, setError,
    progressStep,
    startProgress, stopProgress,
    reset,
    formatFileSize,
    extractText,
    dropzone,
  };
}
