'use client';

import { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';

/* ─── Types ─────────────────────────────────────────────── */

interface PdfTool {
  id: string;
  icon: string;
  name: string;
  description: string;
  endpoint: string;
  accept: Record<string, string[]>;
  multiple: boolean;
  resultExt: string;
  resultMime: string;
  /** If true, the API returns JSON instead of a file blob */
  returnsJson?: boolean;
}

interface ToolState {
  files: File[];
  isProcessing: boolean;
  progress: string;
  resultUrl: string | null;
  resultFilename: string;
  resultText: string | null;     // For OCR-like tools
  resultMeta: string | null;     // Extra info like page count
  error: string | null;
}

/* ─── Tool Definitions ──────────────────────────────────── */

const PDF_TOOLS: PdfTool[] = [
  {
    id: 'compress',
    icon: '🗜️',
    name: 'ضغط PDF',
    description: 'تقليل حجم ملف PDF مع الحفاظ على جودة المحتوى',
    endpoint: '/api/pdf-tools/compress',
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    resultExt: '.pdf',
    resultMime: 'application/pdf',
  },
  {
    id: 'merge',
    icon: '📑',
    name: 'دمج ملفات PDF',
    description: 'دمج عدة ملفات PDF في ملف واحد مرتب',
    endpoint: '/api/pdf-tools/merge',
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    resultExt: '.pdf',
    resultMime: 'application/pdf',
  },
  {
    id: 'split',
    icon: '✂️',
    name: 'تقسيم PDF',
    description: 'تقسيم ملف PDF إلى صفحات منفصلة (ملف ZIP)',
    endpoint: '/api/pdf-tools/split',
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    resultExt: '.zip',
    resultMime: 'application/zip',
  },
  {
    id: 'to-word',
    icon: '📄',
    name: 'PDF إلى Word',
    description: 'تحويل ملف PDF إلى مستند Word قابل للتعديل',
    endpoint: '/api/pdf-tools/to-word',
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    resultExt: '.docx',
    resultMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    id: 'from-word',
    icon: '📝',
    name: 'Word إلى PDF',
    description: 'تحويل مستند Word إلى ملف PDF مع دعم اللغة العربية',
    endpoint: '/api/pdf-tools/from-word',
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
    resultExt: '.pdf',
    resultMime: 'application/pdf',
  },
  {
    id: 'ocr',
    icon: '🔍',
    name: 'استخراج النص (OCR)',
    description: 'استخراج النص من ملفات PDF أو الصور الممسوحة ضوئياً',
    endpoint: '/api/pdf-tools/ocr',
    accept: { 
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/bmp': ['.bmp'],
      'image/tiff': ['.tiff', '.tif'],
      'image/webp': ['.webp'],
    },
    multiple: false,
    resultExt: '.txt',
    resultMime: 'text/plain',
    returnsJson: true,
  },
];

/* ─── Helper ────────────────────────────────────────────── */

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 بايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getBaseName(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.substring(0, dot) : filename;
}

/* ─── Single Tool Card ──────────────────────────────────── */

function ToolCard({ tool }: { tool: PdfTool }) {
  const [state, setState] = useState<ToolState>({
    files: [],
    isProcessing: false,
    progress: '',
    resultUrl: null,
    resultFilename: '',
    resultText: null,
    resultMeta: null,
    error: null,
  });

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    if (rejected.length > 0) {
      const msg = rejected[0].errors[0];
      setState(prev => ({
        ...prev,
        error: msg.code === 'file-too-large'
          ? 'حجم الملف كبير جداً'
          : msg.code === 'file-invalid-type'
            ? 'نوع الملف غير مدعوم'
            : msg.message,
      }));
      return;
    }
    setState(prev => ({
      ...prev,
      files: tool.multiple ? accepted : [accepted[0]],
      resultUrl: null,
      resultText: null,
      resultMeta: null,
      error: null,
      progress: '',
    }));
  }, [tool.multiple]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: tool.accept,
    multiple: tool.multiple,
    maxSize: 50 * 1024 * 1024,
    disabled: state.isProcessing,
  });

  const handleProcess = async () => {
    if (state.files.length === 0) return;

    setState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
      progress: 'جاري المعالجة...',
      resultUrl: null,
      resultText: null,
      resultMeta: null,
    }));

    try {
      const formData = new FormData();
      if (tool.multiple) {
        state.files.forEach(f => formData.append('files', f));
      } else {
        formData.append('file', state.files[0]);
      }

      const res = await fetch(tool.endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `خطأ في الخادم (${res.status})`);
      }

      // Handle JSON response (e.g. OCR tool)
      if (tool.returnsJson) {
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'فشلت المعالجة');
        }
        setState(prev => ({
          ...prev,
          isProcessing: false,
          progress: '',
          resultText: data.text || '',
          resultMeta: data.pages ? `عدد الصفحات: ${data.pages}` : null,
        }));
        return;
      }

      // Handle file response (blob)
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const firstFile = state.files[0];
      const filename = getBaseName(firstFile.name) + tool.resultExt;

      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: '',
        resultUrl: url,
        resultFilename: filename,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: '',
        error: message,
      }));
    }
  };

  const handleDownload = () => {
    if (!state.resultUrl) return;
    const a = document.createElement('a');
    a.href = state.resultUrl;
    a.download = state.resultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyText = async () => {
    if (!state.resultText) return;
    try {
      await navigator.clipboard.writeText(state.resultText);
      setState(prev => ({ ...prev, resultMeta: prev.resultMeta?.startsWith('✅') ? prev.resultMeta : `✅ تم النسخ! ${prev.resultMeta || ''}` }));
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = state.resultText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setState(prev => ({ ...prev, resultMeta: prev.resultMeta?.startsWith('✅') ? prev.resultMeta : `✅ تم النسخ! ${prev.resultMeta || ''}` }));
    }
  };

  const handleDownloadText = () => {
    if (!state.resultText) return;
    const blob = new Blob([state.resultText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getBaseName(state.files[0]?.name || 'extracted') + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (state.resultUrl) {
      URL.revokeObjectURL(state.resultUrl);
    }
    setState({
      files: [],
      isProcessing: false,
      progress: '',
      resultUrl: null,
      resultFilename: '',
      resultText: null,
      resultMeta: null,
      error: null,
    });
  };

  const hasResult = !!state.resultUrl;
  const hasTextResult = !!state.resultText;

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s, transform 0.2s',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Card Header */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: '1px solid #f1f5f9',
        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}>
            {tool.icon}
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a3a5c', marginBottom: 2 }}>
              {tool.name}
            </h3>
            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
              {tool.description}
            </p>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Drop Zone */}
        {!hasResult && !hasTextResult && (
          <div
            {...getRootProps()}
            style={{
              border: isDragActive
                ? '2px dashed #c9a84c'
                : state.files.length > 0
                  ? '2px dashed #bbf7d0'
                  : '2px dashed #d1d5db',
              borderRadius: 14,
              padding: '24px 16px',
              textAlign: 'center',
              cursor: state.isProcessing ? 'wait' : 'pointer',
              background: isDragActive
                ? '#fffbeb'
                : state.files.length > 0
                  ? '#f0fdf4'
                  : '#fafafa',
              transition: 'all 0.2s',
            }}
          >
            <input {...getInputProps()} />
            {state.files.length > 0 ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
                {state.files.map((f, i) => (
                  <p key={i} style={{
                    fontSize: 13, fontWeight: 600, color: '#166534',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {f.name}
                    <span style={{ fontWeight: 400, color: '#15803d', marginRight: 6 }}>
                      ({formatSize(f.size)})
                    </span>
                  </p>
                ))}
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                  {isDragActive ? 'أفلت للاستبدال' : 'اسحب ملف جديد للاستبدال'}
                </p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📤</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  {isDragActive ? 'أفلت الملف هنا...' : 'اسحب الملف هنا أو اضغط'}
                </p>
                <p style={{ fontSize: 11, color: '#94a3b8' }}>
                  {tool.multiple ? 'PDF • عدة ملفات' : tool.id === 'from-word' ? 'DOCX • ملف واحد' : tool.id === 'ocr' ? 'PDF أو صورة • ملف واحد' : 'PDF • ملف واحد'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {state.error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
            fontWeight: 600,
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>❌</span>
            <span style={{ flex: 1 }}>{state.error}</span>
            <button
              onClick={() => setState(prev => ({ ...prev, error: null }))}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 14, color: '#dc2626', padding: 0,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Processing State */}
        {state.isProcessing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '16px 0',
          }}>
            <div style={{
              width: 22, height: 22,
              border: '3px solid #e2e8f0',
              borderTopColor: '#1a3a5c',
              borderRadius: '50%',
              animation: 'pdftools-spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1a3a5c' }}>
              {state.progress}
            </span>
          </div>
        )}

        {/* File Result (download) */}
        {hasResult && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 14,
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
              تمت المعالجة بنجاح!
            </p>
            <p style={{ fontSize: 12, color: '#15803d', marginBottom: 12 }}>
              📎 {state.resultFilename}
            </p>
          </div>
        )}

        {/* Text Result (OCR) */}
        {hasTextResult && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 14,
            padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>
                  تم استخراج النص بنجاح!
                </span>
              </div>
              {state.resultMeta && (
                <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                  {state.resultMeta}
                </span>
              )}
            </div>
            <textarea
              readOnly
              value={state.resultText}
              dir="auto"
              style={{
                width: '100%',
                minHeight: 200,
                maxHeight: 400,
                padding: 12,
                border: '1px solid #d1d5db',
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.7,
                color: '#1f2937',
                background: '#ffffff',
                resize: 'vertical',
                fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
          {hasResult ? (
            <>
              <button
                onClick={handleDownload}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #c9a84c 0%, #b8952e 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(201,168,76,0.3)',
                }}
              >
                ⬇️ تحميل الملف
              </button>
              <button
                onClick={handleReset}
                style={{
                  padding: '12px 16px',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🔄 جديد
              </button>
            </>
          ) : hasTextResult ? (
            <>
              <button
                onClick={handleCopyText}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #c9a84c 0%, #b8952e 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(201,168,76,0.3)',
                }}
              >
                📋 نسخ النص
              </button>
              <button
                onClick={handleDownloadText}
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(26,58,92,0.25)',
                }}
                title="تحميل كملف نصي"
              >
                ⬇️
              </button>
              <button
                onClick={handleReset}
                style={{
                  padding: '12px 16px',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🔄
              </button>
            </>
          ) : (
            <button
              onClick={handleProcess}
              disabled={state.files.length === 0 || state.isProcessing}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: (state.files.length === 0 || state.isProcessing)
                  ? '#e2e8f0'
                  : 'linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 100%)',
                color: (state.files.length === 0 || state.isProcessing) ? '#94a3b8' : 'white',
                border: 'none',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                cursor: (state.files.length === 0 || state.isProcessing) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: (state.files.length === 0 || state.isProcessing)
                  ? 'none'
                  : '0 4px 12px rgba(26,58,92,0.25)',
                transition: 'all 0.2s',
              }}
            >
              {state.isProcessing ? (
                <>
                  <div style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'pdftools-spin 0.8s linear infinite',
                  }} />
                  جاري المعالجة...
                </>
              ) : (
                <>⚡ تنفيذ {tool.name}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Section ──────────────────────────────────────── */

export default function PdfToolsSection() {
  return (
    <div dir="rtl" style={{
      fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    }}>
      {/* Section Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 50%, #1a3a5c 100%)',
        borderRadius: 20,
        padding: '24px 20px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        <div style={{
          position: 'absolute', top: -40, left: -40,
          width: 150, height: 150, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, right: -30,
          width: 110, height: 110, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(42,90,140,0.3) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            🛠️ أدوات PDF
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            أدوات مجانية لمعالجة ملفات PDF — ضغط، دمج، تقسيم، تحويل، واستخراج النص
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16,
      }}>
        {PDF_TOOLS.map(tool => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      {/* Spinner keyframes */}
      <style>{`
        @keyframes pdftools-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
