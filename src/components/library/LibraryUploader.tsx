'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface LibraryFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  telegramFileId?: string;
}

const MAX_FILES = 10;
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 بايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📽️';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
  if (['zip', 'rar'].includes(ext)) return '📦';
  if (['mp4', 'avi', 'mkv'].includes(ext)) return '🎬';
  return '📎';
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function LibraryUploader() {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadDone, setUploadDone] = useState(false);

  // حالة عرض المكتبة
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);

  // حالة حذف الملف
  const [deletePin, setDeletePin] = useState('');
  const [showDeletePin, setShowDeletePin] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'browse' | 'search'>('browse');

  // تحميل الملفات عند فتح التبويب
  const loadFiles = useCallback(async (q?: string, p?: number) => {
    setLibraryLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (p) params.set('page', String(p));
      const res = await fetch(`/api/library/list?${params}`);
      const data = await res.json();
      setLibraryFiles(data.files || []);
      setTotalFiles(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch {
      setLibraryFiles([]);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'browse') loadFiles(searchQuery || undefined, page);
  }, [activeTab, page, searchQuery, loadFiles]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      const errors = fileRejections.map(e => {
        if (e.code === 'file-too-large') return 'حجم الملف يتجاوز 50 ميغابايت';
        if (e.code === 'too-many-files') return 'الحد الأقصى 10 ملفات';
        return e.message;
      });
      setErrorMessage(errors.join(' • '));
    }
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      status: 'pending',
    }));
    setUploadFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES));
    setUploadDone(false);
    setErrorMessage('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_SIZE,
    maxFiles: MAX_FILES,
    disabled: isUploading,
  });

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      setErrorMessage('الرجاء اختيار ملف واحد على الأقل');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');
    setUploadDone(false);
    setUploadFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })));

    try {
      const formData = new FormData();
      uploadFiles.forEach(f => {
        formData.append('files', f.file);
      });

      const res = await fetch('/api/library/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'فشل في رفع الملفات');

      setUploadFiles(prev => prev.map(f => ({ ...f, status: 'success' as const })));
      setSuccessCount(data.count || uploadFiles.length);
      setUploadDone(true);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء الرفع';
      setErrorMessage(msg);
      setUploadFiles(prev => prev.map(f => ({ ...f, status: 'error' as const, error: msg })));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!deletePin) return;
    try {
      const res = await fetch(`/api/library/delete?id=${fileId}&pin=${deletePin}`);
      const data = await res.json();
      if (data.success) {
        setShowDeletePin(null);
        setDeletePin('');
        loadFiles(searchQuery || undefined, page);
      } else {
        setErrorMessage(data.error || 'فشل في حذف الملف');
      }
    } catch {
      setErrorMessage('فشل في حذف الملف');
    }
  };

  const handleDownload = (file: LibraryFile) => {
    window.open(`/api/library/download?id=${file.id}`, '_blank');
  };

  const resetUpload = () => {
    setUploadFiles([]);
    setSuccessCount(0);
    setUploadDone(false);
    setErrorMessage('');
  };

  // البحث بالذكاء الاصطناعي
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResults([]);
    try {
      const res = await fetch(`/api/library/search?q=${encodeURIComponent(aiQuery)}`);
      const data = await res.json();
      setAiResults(data.results || []);
    } catch {
      setAiResults([]);
    } finally {
      setAiLoading(false);
    }
  };

  const tabs = [
    { id: 'browse' as const, label: '📁 استعراض المكتبة', icon: '📚' },
    { id: 'upload' as const, label: '📤 رفع ملفات', icon: '📤' },
    { id: 'search' as const, label: '🔍 بحث ذكي', icon: '🧠' },
  ];

  return (
    <div dir="rtl" style={{ fontFamily: "'Noto Sans Arabic', sans-serif", maxWidth: 800, margin: '0 auto', padding: '16px' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2540 0%, #1a3a5c 50%, #2d5a8a 100%)',
        borderRadius: 20,
        padding: '20px',
        color: 'white',
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>📚</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>المكتبة القانونية</h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
          رفع وتحميل والبحث في الملفات القانونية • مدعومة بتليجرام + Gemini AI
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f1f5f9', borderRadius: 14, padding: 4 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setErrorMessage(''); }}
            style={{
              flex: 1,
              padding: '10px 8px',
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#1a3a5c' : '#64748b',
              border: 'none',
              borderRadius: 11,
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: 'pointer',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {errorMessage && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
          padding: '12px 16px', marginBottom: 16, color: '#991b1b', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>❌</span> {errorMessage}
          <button onClick={() => setErrorMessage('')} style={{
            marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#dc2626',
          }}>✕</button>
        </div>
      )}

      {/* ===== التبويب: استعراض ===== */}
      {activeTab === 'browse' && (
        <div>
          {/* بحث بسيط */}
          <div style={{ marginBottom: 16 }}>
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="ابحث في المكتبة..."
              style={{
                width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0',
                borderRadius: 14, fontSize: 14, outline: 'none', background: '#f8fafc',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#1a3a5c'}
              onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
          </div>

          {totalFiles > 0 && (
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12, textAlign: 'center' }}>
              📊 {totalFiles} ملف في المكتبة
            </p>
          )}

          {libraryLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{
                width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#1a3a5c',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
              }} />
              <p style={{ color: '#94a3b8', fontSize: 13 }}>جاري تحميل الملفات...</p>
            </div>
          ) : libraryFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📂</div>
              <p style={{ fontSize: 15, fontWeight: 600 }}>المكتبة فارغة</p>
              <p style={{ fontSize: 13 }}>انتقل لتبويب "رفع ملفات" لإضافة ملفات</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {libraryFiles.map(file => (
                <div key={file.id} style={{
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: 14,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'all 0.15s',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
                  }}>
                    {getFileIcon(file.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {file.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                      {formatSize(file.size)} • {formatDate(file.uploadedAt)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleDownload(file)} title="تحميل"
                      style={{
                        width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', color: '#16a34a',
                        border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>⬇️</button>
                    <button onClick={() => setShowDeletePin(file.id)} title="حذف"
                      style={{
                        width: 36, height: 36, borderRadius: 10, background: '#fef2f2', color: '#dc2626',
                        border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>🗑️</button>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{
                      padding: '8px 16px', borderRadius: 10, background: page === 1 ? '#f1f5f9' : 'white',
                      border: '1px solid #e2e8f0', cursor: page === 1 ? 'not-allowed' : 'pointer',
                      fontSize: 14, color: '#1a3a5c',
                    }}>→</button>
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    {page} / {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{
                      padding: '8px 16px', borderRadius: 10, background: page === totalPages ? '#f1f5f9' : 'white',
                      border: '1px solid #e2e8f0', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: 14, color: '#1a3a5c',
                    }}>←</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== التبويب: رفع ===== */}
      {activeTab === 'upload' && (
        <div>
          {uploadDone ? (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16,
              padding: '24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#166534' }}>
                تم رفع {successCount} ملف بنجاح!
              </p>
              <button onClick={resetUpload} style={{
                marginTop: 16, padding: '10px 24px', background: '#1a3a5c', color: 'white',
                border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
                رفع ملفات جديدة
              </button>
            </div>
          ) : (
            <>
              {/* Drop Zone */}
              <div {...getRootProps()} style={{
                border: isDragActive ? '2px dashed #c9a84c' : '2px dashed #cbd5e1',
                borderRadius: 20, padding: '32px 20px', textAlign: 'center', cursor: isUploading ? 'wait' : 'pointer',
                background: isDragActive ? '#fffbeb' : '#f8fafc', marginBottom: 16, transition: 'all 0.2s',
              }}>
                <input {...getInputProps()} />
                <div style={{ fontSize: 36, marginBottom: 4 }}>{isDragActive ? '📥' : '📎'}</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  {isDragActive ? 'أفلت الملفات هنا...' : 'اسحب الملفات وأفلتها هنا'}
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>
                  أو <span style={{ color: '#1a3a5c', fontWeight: 600, textDecoration: 'underline' }}>اضغط لاختيار الملفات</span>
                </p>
                <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>
                  PDF, DOCX, XLSX, صور... • حتى 10 ملفات • 50 ميغابايت كحد أقصى
                </p>
              </div>

              {/* File List */}
              {uploadFiles.length > 0 && (
                <div style={{
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: 16,
                  overflow: 'hidden', marginBottom: 16,
                }}>
                  <div style={{
                    padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
                    fontSize: 13, fontWeight: 700, color: '#1a3a5c',
                  }}>
                    📋 {uploadFiles.length} ملف — {formatSize(uploadFiles.reduce((a, f) => a + f.file.size, 0))}
                  </div>
                  {uploadFiles.map((f, i) => (
                    <div key={i} style={{
                      padding: '10px 16px', borderBottom: i < uploadFiles.length - 1 ? '1px solid #f1f5f9' : 'none',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ fontSize: 18 }}>
                        {f.status === 'success' ? '✅' : f.status === 'error' ? '❌' : f.status === 'uploading' ? '⏳' : getFileIcon(f.file.name)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 500, color: '#1e293b', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{f.file.name}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{formatSize(f.file.size)}</p>
                      </div>
                      {!isUploading && (
                        <button onClick={() => removeFile(i)} style={{
                          width: 28, height: 28, background: '#fef2f2', color: '#dc2626',
                          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                        }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              <button onClick={handleUpload} disabled={isUploading || uploadFiles.length === 0}
                style={{
                  width: '100%', padding: '14px', border: 'none', borderRadius: 16,
                  fontSize: 16, fontWeight: 700, color: 'white', cursor: (isUploading || uploadFiles.length === 0) ? 'not-allowed' : 'pointer',
                  background: (isUploading || uploadFiles.length === 0) ? '#e2e8f0' : 'linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 100%)',
                  boxShadow: (isUploading || uploadFiles.length === 0) ? 'none' : '0 4px 12px rgba(26,58,92,0.3)',
                }}>
                {isUploading ? '⏳ جاري الرفع...' : `📤 رفع ${uploadFiles.length} ملف`}
              </button>
            </>
          )}
        </div>
      )}

      {/* ===== التبويب: بحث ذكي ===== */}
      {activeTab === 'search' && (
        <div>
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #fde68a', borderRadius: 16, padding: '16px', marginBottom: 16, textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>🧠</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: 0 }}>بحث ذكي بالذكاء الاصطناعي</p>
            <p style={{ fontSize: 12, color: '#b45309', margin: '4px 0 0' }}>Gemini AI يبحث داخل محتوى الملفات</p>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
              placeholder="ابحث في محتوى الملفات... مثال: اختصاص المحاكم التجارية"
              style={{
                flex: 1, padding: '12px 16px', border: '1.5px solid #e2e8f0',
                borderRadius: 14, fontSize: 14, outline: 'none', background: '#f8fafc',
              }}
            />
            <button onClick={handleAiSearch} disabled={aiLoading || !aiQuery.trim()}
              style={{
                padding: '12px 20px', background: aiLoading ? '#e2e8f0' : 'linear-gradient(135deg, #1a3a5c, #2a5a8c)',
                color: 'white', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 600,
                cursor: aiLoading || !aiQuery.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              }}>
              {aiLoading ? '🔍...' : '🔍 ابحث'}
            </button>
          </div>

          {aiLoading && (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <div style={{
                width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#c9a84c',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
              }} />
              <p style={{ color: '#64748b', fontSize: 13 }}>Gemini يبحث في الملفات...</p>
            </div>
          )}

          {!aiLoading && aiResults.length > 0 && (
            <div>
              <p style={{ fontSize: 12, color: '#16a34a', marginBottom: 12, fontWeight: 600 }}>
                🎯 تم العثور على {aiResults.length} نتيجة
              </p>
              {aiResults.map((r, i) => (
                <button key={i} onClick={() => handleDownload({ id: r.fileId, name: r.file } as any)}
                  style={{
                    width: '100%', textAlign: 'right', background: 'white', border: '1px solid #e2e8f0',
                    borderRadius: 14, padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{getFileIcon(r.file)}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a3a5c' }}>{r.file}</span>
                  </div>
                  <p style={{
                    fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3,
                  }}>{r.snippet}</p>
                </button>
              ))}
            </div>
          )}

          {!aiLoading && aiResults.length === 0 && aiQuery && (
            <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <p>لم يتم العثور على نتائج</p>
            </div>
          )}
        </div>
      )}

      {/* Modal حذف الملف */}
      {showDeletePin && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowDeletePin(null)}>
          <div style={{
            background: 'white', borderRadius: 20, padding: 24, width: '90%', maxWidth: 360,
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', marginBottom: 12, textAlign: 'center' }}>
              🗑️ حذف ملف
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, textAlign: 'center' }}>
              أدخل رمز PIN للمسؤول
            </p>
            <input
              type="password"
              value={deletePin}
              onChange={e => setDeletePin(e.target.value)}
              placeholder="•••••••••"
              style={{
                width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0',
                borderRadius: 12, fontSize: 16, textAlign: 'center', outline: 'none',
                background: '#f8fafc', letterSpacing: 3, marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowDeletePin(null)} style={{
                flex: 1, padding: '10px', background: '#f1f5f9', color: '#64748b',
                border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>إلغاء</button>
              <button onClick={() => handleDelete(showDeletePin)} style={{
                flex: 1, padding: '10px', background: '#dc2626', color: 'white',
                border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>حذف</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
