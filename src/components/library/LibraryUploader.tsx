'use client';

import { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';

interface LibraryUploaderProps {
  onUploadComplete?: (fileCount: number) => void;
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB (Redis storage limit)

export default function LibraryUploader({ onUploadComplete }: LibraryUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [pin, setPin] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      for (const rejection of fileRejections) {
        const errors = rejection.errors.map(e => {
          if (e.code === 'file-too-large') return 'حجم الملف يتجاوز 10 ميغابايت';
          if (e.code === 'too-many-files') return 'الحد الأقصى 10 ملفات';
          return e.message;
        });
        setErrorMessage(errors.join('، '));
      }
    }

    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending',
    }));

    setFiles(prev => {
      const combined = [...prev, ...newFiles];
      return combined.slice(0, MAX_FILES);
    });

    setUploadSuccess(false);
    setErrorMessage('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: MAX_SIZE,
    maxFiles: MAX_FILES,
    disabled: isUploading,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setErrorMessage('الرجاء اختيار ملف واحد على الأقل');
      return;
    }

    if (!pin) {
      setErrorMessage('الرجاء إدخال رقم التعريف الشخصي');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');
    setUploadSuccess(false);

    // Mark all as uploading
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const, progress: 10 })));

    try {
      const formData = new FormData();
      formData.append('pin', pin);
      files.forEach(f => {
        formData.append('files', f.file);
      });

      const response = await fetch('/api/library/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في رفع الملفات');
      }

      // Mark all as success
      setFiles(prev => prev.map(f => ({ ...f, status: 'success' as const, progress: 100 })));
      setUploadSuccess(true);
      setSuccessCount(data.count || files.length);

      if (onUploadComplete) {
        onUploadComplete(data.count || files.length);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء الرفع';
      setErrorMessage(msg);
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error' as const,
        error: msg,
      })));
    } finally {
      setIsUploading(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setPin('');
    setUploadSuccess(false);
    setSuccessCount(0);
    setErrorMessage('');
  };

  return (
    <div dir="rtl" style={{ fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" }}>
      {/* Header */}
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
          position: 'absolute', top: -40, right: -40,
          width: 140, height: 140, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: -30,
          width: 100, height: 100, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(42,90,140,0.3) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            📤 رفع ملفات إلى المكتبة
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            اسحب ملفات PDF وأفلتها هنا أو اضغط للاختيار • الحد الأقصى 10 ملفات، 10 ميغابايت لكل ملف
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {uploadSuccess && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          border: '1px solid #bbf7d0',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#dcfce7', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              ✅
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#166534' }}>
                تم رفع الملفات بنجاح!
              </p>
              <p style={{ fontSize: 13, color: '#15803d' }}>
                تم رفع <span style={{ fontWeight: 700 }}>{successCount}</span> ملف إلى المكتبة
              </p>
            </div>
          </div>
          <button
            onClick={resetAll}
            style={{
              padding: '8px 16px',
              background: '#1a3a5c',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            رفع ملفات جديدة
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 14,
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#991b1b',
          fontSize: 14,
          fontWeight: 600,
        }}>
          <span style={{ fontSize: 18 }}>❌</span>
          {errorMessage}
          <button
            onClick={() => setErrorMessage('')}
            style={{
              marginRight: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: '#dc2626',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {!uploadSuccess && (
        <>
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            style={{
              border: isDragActive
                ? '2px dashed #c9a84c'
                : files.length > 0
                  ? '2px dashed #bbf7d0'
                  : '2px dashed #cbd5e1',
              borderRadius: 20,
              padding: '36px 20px',
              textAlign: 'center',
              cursor: isUploading ? 'wait' : 'pointer',
              background: isDragActive
                ? '#fffbeb'
                : files.length > 0
                  ? '#f0fdf4'
                  : '#f8fafc',
              transition: 'all 0.2s',
              marginBottom: 20,
            }}
          >
            <input {...getInputProps()} />
            <div style={{ fontSize: 40, marginBottom: 8 }}>
              {isDragActive ? '📥' : '📄'}
            </div>
            {isDragActive ? (
              <p style={{ fontSize: 16, fontWeight: 700, color: '#c9a84c', marginBottom: 4 }}>
                أفلت الملفات هنا...
              </p>
            ) : (
              <>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  اسحب ملفات PDF وأفلتها هنا
                </p>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>
                  أو <span style={{ color: '#1a3a5c', fontWeight: 600, textDecoration: 'underline' }}>اضغط لاختيار الملفات</span>
                </p>
                <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 6 }}>
                  PDF فقط • حتى 10 ملفات • 10 ميغابايت كحد أقصى
                </p>
              </>
            )}
          </div>

          {/* PIN Input */}
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '16px 20px',
            marginBottom: 20,
          }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#475569',
              marginBottom: 8,
            }}>
              🔑 رقم التعريف الشخصي (PIN) — للمسؤولين فقط
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••••"
              disabled={isUploading}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1.5px solid #e2e8f0',
                borderRadius: 14,
                fontSize: 16,
                textAlign: 'center',
                outline: 'none',
                letterSpacing: 3,
                background: '#f8fafc',
                direction: 'ltr',
                fontFamily: 'monospace',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#c9a84c'; e.currentTarget.style.background = '#fffbeb'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 20,
            }}>
              <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1a3a5c' }}>
                  📋 الملفات المحددة ({files.length})
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {formatSize(files.reduce((acc, f) => acc + f.file.size, 0))}
                </span>
              </div>

              {files.map((f, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px 20px',
                    borderBottom: index < files.length - 1 ? '1px solid #f1f5f9' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Status icon */}
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                    background: f.status === 'success'
                      ? '#dcfce7'
                      : f.status === 'error'
                        ? '#fee2e2'
                        : f.status === 'uploading'
                          ? '#dbeafe'
                          : '#f1f5f9',
                  }}>
                    {f.status === 'success' ? '✅' : f.status === 'error' ? '❌' : f.status === 'uploading' ? '⏳' : '📄'}
                  </div>

                  {/* File info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: f.status === 'error' ? '#dc2626' : '#1e293b',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {f.file.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>
                      {formatSize(f.file.size)}
                    </p>
                    {/* Progress bar */}
                    {f.status === 'uploading' && (
                      <div style={{
                        height: 4,
                        borderRadius: 2,
                        background: '#e2e8f0',
                        marginTop: 6,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${f.progress}%`,
                          background: 'linear-gradient(90deg, #1a3a5c, #c9a84c)',
                          borderRadius: 2,
                          transition: 'width 0.3s',
                        }} />
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  {!isUploading && (
                    <button
                      onClick={() => removeFile(index)}
                      style={{
                        width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: (isUploading || files.length === 0)
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 100%)',
              color: (isUploading || files.length === 0) ? '#94a3b8' : 'white',
              border: 'none',
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 700,
              cursor: (isUploading || files.length === 0) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: (isUploading || files.length === 0)
                ? 'none'
                : '0 4px 16px rgba(26,58,92,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {isUploading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: 20, height: 20,
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                جاري رفع الملفات...
              </>
            ) : (
              <>
                📤 رفع {files.length} ملف إلى المكتبة
              </>
            )}
          </button>

          {/* CSS for spinner */}
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
