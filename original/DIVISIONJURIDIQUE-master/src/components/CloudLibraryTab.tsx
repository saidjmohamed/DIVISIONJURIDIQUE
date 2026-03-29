'use client';

import { useState, useEffect } from 'react';
import { 
  Upload, Download, FileText, File, FileImage, FileArchive, 
  Search, FolderOpen, Loader2, CheckCircle, X, AlertCircle,
  BookOpen, Scale, FileSignature, Briefcase, ChevronDown, ChevronUp,
  RefreshCw, Trash2, Lock
} from 'lucide-react';

interface CloudFile {
  id: string;
  fileName: string;
  fileSize: number;
  category: string;
  mimeType: string;
  originalFileId: string;
  originalMessageId: number;
  uploadedAt: string;
  description?: string;
  contributor?: {
    name?: string;
    surname?: string;
    profession?: string;
    state?: string;
    phone?: string;
    email?: string;
  };
  telegramFileId?: string;
  telegramMessageId?: number;
}

interface SyncResult {
  success: boolean;
  valid?: number;
  removed?: number;
  message?: string;
  error?: string;
  channelFiles?: string[];
  removedFiles?: string[];
}

const categories = [
  { id: 'قوانين', label: 'قوانين', icon: Scale },
  { id: 'عقود', label: 'عقود', icon: FileSignature },
  { id: 'نماذج', label: 'نماذج', icon: Briefcase },
  { id: 'كتب', label: 'كتب قانونية', icon: BookOpen },
  { id: 'أخرى', label: 'أخرى', icon: FolderOpen },
];

// كلمة سر الإدارة (بسيطة لحماية الرفع والحذف)
const ADMIN_PIN = 'shamil2025';

export default function CloudLibraryTab() {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  
  // حالة الإدارة
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // حالة مزامنة الفهرس
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showSyncResult, setShowSyncResult] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  
  // نموذج الرفع المبسط
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFileCategory, setNewFileCategory] = useState('قوانين');
  const [newFileDescription, setNewFileDescription] = useState('');

  // جلب الملفات
  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/cloud/fetch');
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // فتح وضع الإدارة
  const handleAdminLogin = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('كلمة السر غير صحيحة');
      setPinInput('');
    }
  };

  // البحث في الملفات
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      fetchFiles();
      return;
    }
    
    try {
      const response = await fetch(`/api/cloud/fetch?search=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // مزامنة الفهرس مع Telegram
  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setShowSyncResult(false);
    
    try {
      const response = await fetch('/api/cloud/sync', { method: 'POST' });
      const data = await response.json();
      
      setSyncResult(data);
      setShowSyncResult(true);
      
      if (data.success) {
        await fetchFiles();
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncResult({
        success: false,
        error: 'فشل في الاتصال بالخادم'
      });
      setShowSyncResult(true);
    } finally {
      setSyncing(false);
    }
  };

  // رفع ملف (للمسؤول فقط)
  const handleUpload = async () => {
    if (!newFile) return;

    setUploading(true);
    setUploadProgress('جاري رفع الملف إلى Telegram...');

    try {
      // رفع الملف إلى Telegram
      const originalFormData = new FormData();
      originalFormData.append('file', newFile);
      
      const originalRes = await fetch('/api/telegram/upload', {
        method: 'POST',
        body: originalFormData
      });
      const originalData = await originalRes.json();
      
      if (!originalData.success) {
        throw new Error(originalData.error || 'فشل في رفع الملف');
      }

      // حفظ في Redis
      setUploadProgress('جاري حفظ البيانات...');
      
      const saveRes = await fetch('/api/cloud/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: newFile.name,
          fileSize: newFile.size,
          category: newFileCategory,
          mimeType: newFile.type || 'application/octet-stream',
          originalFileId: originalData.fileId,
          originalMessageId: originalData.messageId,
          description: newFileDescription || undefined,
        })
      });

      const saveData = await saveRes.json();

      if (saveData.success) {
        setUploadProgress('تم الرفع بنجاح! ✅');
        
        await fetchFiles();
        
        setTimeout(() => {
          setShowUploadModal(false);
          setNewFile(null);
          setNewFileDescription('');
          setUploadProgress('');
        }, 1500);
      } else {
        throw new Error(saveData.error || 'فشل في حفظ البيانات');
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadProgress(`❌ خطأ: ${error.message || 'حدث خطأ أثناء الرفع'}`);
    } finally {
      setUploading(false);
    }
  };

  // حذف ملف (للمسؤول فقط)
  const handleDelete = async (file: CloudFile) => {
    if (!confirm(`هل أنت متأكد من حذف "${file.fileName}"؟`)) return;
    
    setDeletingId(file.id);
    
    try {
      const response = await fetch(`/api/cloud/files?id=${file.id}`, { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        await fetchFiles();
      } else {
        alert(`خطأ: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('فشل في حذف الملف');
    } finally {
      setDeletingId(null);
    }
  };

  // تنزيل الملف
  const handleDownload = async (file: CloudFile) => {
    const fileId = file.originalFileId || file.telegramFileId;
    if (!fileId) return;
    
    window.open(`/api/telegram/download?fileId=${fileId}&redirect=true`, '_blank');
  };

  // تنسيق حجم الملف
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // أيقونة الملف
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.includes('pdf')) return FileText;
    if (mimeType.includes('word')) return FileText;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return FileArchive;
    return File;
  };

  // تصفية الملفات حسب التصنيف
  const filteredFiles = files.filter(file => {
    if (searchQuery.length >= 2) return true;
    return selectedCategory === 'الكل' || file.category === selectedCategory;
  });

  // إحصائيات
  const stats = {
    total: files.length,
    totalSize: files.reduce((acc, f) => acc + f.fileSize, 0),
    byCategory: categories.map(c => ({
      ...c,
      count: files.filter(f => f.category === c.id).length
    }))
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ═══ العنوان والإحصائيات ═══ */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 50%, #1e3a5f 100%)",
        borderRadius: 20,
        padding: "28px 24px",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* دائرة ديكورية */}
        <div style={{
          position: "absolute", top: -40, left: -40,
          width: 160, height: 160, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(240,192,64,0.12) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: -30, right: -30,
          width: 120, height: 120, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(45,90,138,0.4) 0%, transparent 70%)",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📁 المكتبة القانونية</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                مرجع شامل للقوانين والوثائق القانونية الجزائرية
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!isAdmin ? (
                <button
                  onClick={() => setShowPinModal(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px",
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: 12, color: "white",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    backdropFilter: "blur(8px)",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                >
                  <Lock style={{ width: 16, height: 16 }} />
                  وضع الإدارة
                </button>
              ) : (
                <button
                  onClick={() => setIsAdmin(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px",
                    background: "linear-gradient(135deg, #f0c040 0%, #e8a800 100%)",
                    border: "none",
                    borderRadius: 12, color: "#0f2540",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(240,192,64,0.3)",
                  }}
                >
                  ✅ مسؤول
                </button>
              )}
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginTop: 16,
          }}>
            <div style={{
              background: "rgba(255,255,255,0.12)",
              borderRadius: 14, padding: "14px 12px",
              textAlign: "center",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{stats.total}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>ملف</div>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.12)",
              borderRadius: 14, padding: "14px 12px",
              textAlign: "center",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{formatFileSize(stats.totalSize)}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>إجمالي الحجم</div>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.12)",
              borderRadius: 14, padding: "14px 12px",
              textAlign: "center",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{categories.length}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>تصنيف</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ شريط الأدوات ═══ */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {/* البحث */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            width: 18, height: 18, color: "#94a3b8",
          }} />
          <input
            type="text"
            placeholder="ابحث في الملفات..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: "100%", padding: "10px 40px 10px 16px",
              border: "1.5px solid #e2e8f0", borderRadius: 14,
              fontSize: 14, outline: "none",
              transition: "border-color 0.2s",
              background: "white",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "#1e3a5f"}
            onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
          />
        </div>

        {/* أزرار الإدارة */}
        {isAdmin && (
          <>
            {/* زر تحديث الفهرس */}
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 16px",
                background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                border: "none", borderRadius: 14, color: "white",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(249,115,22,0.25)",
                opacity: syncing ? 0.6 : 1,
                minWidth: 130,
                justifyContent: "center",
              }}
              title="تحديث الفهرس - إزالة الملفات المحذوفة من Telegram"
            >
              {syncing ? (
                <>
                  <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                  <span>جاري التحديث...</span>
                </>
              ) : (
                <>
                  <RefreshCw style={{ width: 16, height: 16 }} />
                  <span>تحديث الفهرس</span>
                </>
              )}
            </button>

            {/* زر الإضافة */}
            <button
              onClick={() => setShowUploadModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 16px",
                background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)",
                border: "none", borderRadius: 14, color: "white",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(30,58,95,0.25)",
                minWidth: 120,
                justifyContent: "center",
              }}
            >
              <Upload style={{ width: 16, height: 16 }} />
              إضافة ملف
            </button>
          </>
        )}
      </div>

      {/* ═══ نتيجة تحديث الفهرس ═══ */}
      {showSyncResult && syncResult && (
        <div 
          style={{
            borderRadius: 16, padding: "14px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: syncResult.success 
              ? "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)"
              : "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)",
            border: syncResult.success ? "1px solid #bbf7d0" : "1px solid #fecaca",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {syncResult.success ? (
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "#dcfce7", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <CheckCircle style={{ width: 22, height: 22, color: "#16a34a" }} />
              </div>
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "#fee2e2", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <AlertCircle style={{ width: 22, height: 22, color: "#dc2626" }} />
              </div>
            )}
            <div>
              {syncResult.success ? (
                <div style={{ color: "#166534" }}>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>تم تحديث الفهرس بنجاح!</p>
                  <p style={{ fontSize: 13, color: "#15803d" }}>
                    <span style={{ fontWeight: 600 }}>{syncResult.valid}</span> ملف موجود • 
                    <span style={{ fontWeight: 600, color: "#dc2626", marginRight: 4 }}> {syncResult.removed}</span> ملف محذوف
                  </p>
                </div>
              ) : (
                <div style={{ color: "#991b1b" }}>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>فشل في تحديث الفهرس</p>
                  <p style={{ fontSize: 13, color: "#b91c1c" }}>{syncResult.error}</p>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {syncResult.success && syncResult.channelFiles && syncResult.channelFiles.length > 0 && (
              <button
                onClick={() => setShowSyncModal(true)}
                style={{
                  padding: "6px 12px", background: "#1e3a5f", color: "white",
                  borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                }}
              >
                عرض التفاصيل
              </button>
            )}
            <button
              onClick={() => setShowSyncResult(false)}
              style={{
                padding: 6, border: "none", background: "transparent",
                cursor: "pointer", borderRadius: 8,
              }}
            >
              <X style={{ width: 18, height: 18, color: "#6b7280" }} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ نافذة تفاصيل المزامنة ═══ */}
      {showSyncModal && syncResult && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50, padding: 16,
        }}>
          <div style={{
            background: "white", borderRadius: 20, width: "100%", maxWidth: 480,
            maxHeight: "80vh", overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid #e5e7eb",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)",
              color: "white",
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>نتيجة تحديث الفهرس</h3>
              <button
                onClick={() => setShowSyncModal(false)}
                style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer", borderRadius: "50%" }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            
            <div style={{ padding: 20, overflowY: "auto", maxHeight: "calc(80vh - 56px)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#16a34a" }}>{syncResult.valid}</div>
                  <div style={{ fontSize: 13, color: "#166534" }}>ملف موجود</div>
                </div>
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#dc2626" }}>{syncResult.removed}</div>
                  <div style={{ fontSize: 13, color: "#991b1b" }}>ملف محذوف</div>
                </div>
              </div>

              {syncResult.removedFiles && syncResult.removedFiles.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle style={{ width: 16, height: 16, color: "#dc2626" }} />
                    الملفات المحذوفة ({syncResult.removedFiles.length})
                  </h4>
                  <div style={{ background: "#fef2f2", borderRadius: 12, padding: 12, maxHeight: 160, overflowY: "auto" }}>
                    {syncResult.removedFiles.map((file, idx) => (
                      <div key={idx} style={{ fontSize: 13, color: "#991b1b", display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626" }}></span>
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowSyncModal(false)}
                style={{
                  width: "100%", padding: "12px", background: "#f1f5f9",
                  color: "#475569", borderRadius: 14, fontWeight: 600,
                  fontSize: 14, cursor: "pointer", border: "none",
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ التصنيفات ═══ */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          onClick={() => { setSelectedCategory('الكل'); fetchFiles(); }}
          style={{
            padding: "8px 16px", borderRadius: 30, fontSize: 13, fontWeight: 600,
            cursor: "pointer", border: "none",
            background: selectedCategory === 'الكل' ? "#1e3a5f" : "#f1f5f9",
            color: selectedCategory === 'الكل' ? "white" : "#64748b",
            transition: "all 0.2s",
          }}
        >
          الكل ({stats.total})
        </button>
        {stats.byCategory.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              padding: "8px 16px", borderRadius: 30, fontSize: 13, fontWeight: 600,
              cursor: "pointer", border: "none",
              display: "flex", alignItems: "center", gap: 6,
              background: selectedCategory === cat.id ? "#1e3a5f" : "#f1f5f9",
              color: selectedCategory === cat.id ? "white" : "#64748b",
              transition: "all 0.2s",
            }}
          >
            <cat.icon style={{ width: 14, height: 14 }} />
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* ═══ قائمة الملفات ═══ */}
      {filteredFiles.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 16px",
          background: "#f8fafc", borderRadius: 20,
        }}>
          <FolderOpen style={{ width: 56, height: 56, color: "#cbd5e1", margin: "0 auto 16px" }} />
          <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 4 }}>لا توجد ملفات في هذا التصنيف</p>
          <p style={{ color: "#cbd5e1", fontSize: 13 }}>
            {isAdmin ? 'اضغط "إضافة ملف" لرفع ملف جديد' : 'سيتم إضافة ملفات قريباً'}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filteredFiles.map(file => {
            const FileIcon = getFileIcon(file.mimeType);
            const isExpanded = expandedFileId === file.id;
            
            return (
              <div
                key={file.id}
                style={{
                  background: "white",
                  border: "1px solid #f1f5f9",
                  borderRadius: 16, overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
                  <div style={{
                    width: 48, height: 48,
                    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                    borderRadius: 14, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <FileIcon style={{ width: 22, height: 22, color: "#1e3a5f" }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontWeight: 600, color: "#1e293b", fontSize: 14, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.fileName}
                    </h3>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8" }}>
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#cbd5e1" }}></span>
                      <span style={{
                        background: "#eff6ff", color: "#1e3a5f",
                        padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      }}>
                        {file.category}
                      </span>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#cbd5e1" }}></span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString('ar-DZ')}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => handleDownload(file)}
                      title="تحميل الملف"
                      style={{
                        width: 40, height: 40, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        background: "#eff6ff", color: "#1e3a5f",
                        borderRadius: 12, cursor: "pointer", border: "none",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"}
                      onMouseLeave={e => e.currentTarget.style.background = "#eff6ff"}
                    >
                      <Download style={{ width: 18, height: 18 }} />
                    </button>
                    
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(file)}
                        disabled={deletingId === file.id}
                        title="حذف الملف"
                        style={{
                          width: 40, height: 40, display: "flex",
                          alignItems: "center", justifyContent: "center",
                          background: "#fef2f2", color: "#dc2626",
                          borderRadius: 12, cursor: "pointer", border: "none",
                          transition: "background 0.2s",
                          opacity: deletingId === file.id ? 0.5 : 1,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                        onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}
                      >
                        {deletingId === file.id ? (
                          <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
                        ) : (
                          <Trash2 style={{ width: 18, height: 18 }} />
                        )}
                      </button>
                    )}

                    {file.description && (
                      <button
                        onClick={() => setExpandedFileId(isExpanded ? null : file.id)}
                        style={{
                          padding: 8, border: "none", background: "transparent",
                          cursor: "pointer", borderRadius: 10, color: "#94a3b8",
                        }}
                      >
                        {isExpanded ? <ChevronUp style={{ width: 18, height: 18 }} /> : <ChevronDown style={{ width: 18, height: 18 }} />}
                      </button>
                    )}
                  </div>
                </div>
                
                {isExpanded && file.description && (
                  <div style={{ borderTop: "1px solid #f1f5f9", background: "#f8fafc", padding: "12px 16px" }}>
                    <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>{file.description}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ نافذة إدخال كلمة السر ═══ */}
      {showPinModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50, padding: 16,
        }}>
          <div style={{
            background: "white", borderRadius: 20, width: "100%", maxWidth: 360, padding: 28,
            textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <Lock style={{ width: 24, height: 24, color: "white" }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>وضع الإدارة</h3>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>أدخل كلمة السر للوصول إلى إدارة المكتبة</p>

            <input
              type="password"
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="كلمة السر"
              autoFocus
              style={{
                width: "100%", padding: "12px 16px",
                border: pinError ? "2px solid #fecaca" : "1.5px solid #e2e8f0",
                borderRadius: 14, fontSize: 16, textAlign: "center",
                outline: "none", letterSpacing: 2, marginBottom: 4,
                background: pinError ? "#fef2f2" : "white",
              }}
            />
            {pinError && (
              <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>{pinError}</p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => { setShowPinModal(false); setPinInput(''); setPinError(''); }}
                style={{
                  flex: 1, padding: "12px", background: "#f1f5f9",
                  color: "#64748b", borderRadius: 14, fontWeight: 600,
                  fontSize: 14, cursor: "pointer", border: "none",
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleAdminLogin}
                style={{
                  flex: 1, padding: "12px",
                  background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)",
                  color: "white", borderRadius: 14, fontWeight: 700,
                  fontSize: 14, cursor: "pointer", border: "none",
                  boxShadow: "0 4px 16px rgba(30,58,95,0.25)",
                }}
              >
                دخول
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ نافذة رفع ملف (مبسطة) ═══ */}
      {showUploadModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50, padding: 16, overflowY: "auto",
        }}>
          <div style={{
            background: "white", borderRadius: 20, width: "100%", maxWidth: 480, padding: 28,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>رفع ملف جديد</h3>
                <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>سيتم حفظ الملف على Telegram تلقائياً</p>
              </div>
              <button
                onClick={() => { setShowUploadModal(false); setNewFile(null); setNewFileDescription(''); setUploadProgress(''); }}
                style={{ padding: 6, border: "none", background: "#f1f5f9", cursor: "pointer", borderRadius: "50%" }}
              >
                <X style={{ width: 18, height: 18, color: "#64748b" }} />
              </button>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {/* اختيار الملف */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>الملف *</label>
                <div style={{
                  border: newFile ? "2px solid #bbf7d0" : "2px dashed #cbd5e1",
                  borderRadius: 14, padding: "24px 16px",
                  textAlign: "center", cursor: "pointer",
                  background: newFile ? "#f0fdf4" : "#f8fafc",
                  transition: "all 0.2s",
                }}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  {newFile ? (
                    <div>
                      <FileText style={{ width: 32, height: 32, color: "#16a34a", margin: "0 auto 8px" }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#166534" }}>{newFile.name}</p>
                      <p style={{ fontSize: 12, color: "#15803d", marginTop: 4 }}>{formatFileSize(newFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <Upload style={{ width: 32, height: 32, color: "#94a3b8", margin: "0 auto 8px" }} />
                      <p style={{ fontSize: 14, color: "#94a3b8" }}>اضغط لاختيار ملف</p>
                      <p style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>PDF, DOC, DOCX, TXT, JPG, PNG</p>
                    </div>
                  )}
                </div>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                  style={{ display: "none" }}
                />
              </div>

              {/* التصنيف */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>التصنيف *</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setNewFileCategory(cat.id)}
                      style={{
                        padding: "10px 8px",
                        background: newFileCategory === cat.id
                          ? "linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)"
                          : "#f8fafc",
                        color: newFileCategory === cat.id ? "white" : "#64748b",
                        border: newFileCategory === cat.id ? "none" : "1.5px solid #e2e8f0",
                        borderRadius: 12, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", transition: "all 0.2s",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 4,
                      }}
                    >
                      <cat.icon style={{ width: 18, height: 18 }} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* الوصف */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>وصف (اختياري)</label>
                <input
                  type="text"
                  value={newFileDescription}
                  onChange={(e) => setNewFileDescription(e.target.value)}
                  placeholder="وصف مختصر للملف..."
                  style={{
                    width: "100%", padding: "10px 14px",
                    border: "1.5px solid #e2e8f0", borderRadius: 12,
                    fontSize: 14, outline: "none",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "#1e3a5f"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                />
              </div>

              {/* حالة الرفع */}
              {uploadProgress && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 16px", borderRadius: 12,
                  background: uploadProgress.includes('بنجاح') || uploadProgress.includes('✅')
                    ? "#f0fdf4" : uploadProgress.includes('خطأ') || uploadProgress.includes('❌')
                    ? "#fef2f2" : "#eff6ff",
                  color: uploadProgress.includes('بنجاح') || uploadProgress.includes('✅')
                    ? "#166534" : uploadProgress.includes('خطأ') || uploadProgress.includes('❌')
                    ? "#991b1b" : "#1e3a5f",
                  fontSize: 13, fontWeight: 600,
                }}>
                  {uploadProgress.includes('بنجاح') || uploadProgress.includes('✅') ? (
                    <CheckCircle style={{ width: 18, height: 18 }} />
                  ) : uploadProgress.includes('خطأ') || uploadProgress.includes('❌') ? (
                    <AlertCircle style={{ width: 18, height: 18 }} />
                  ) : (
                    <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
                  )}
                  {uploadProgress}
                </div>
              )}

              {/* أزرار */}
              <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
                <button
                  onClick={() => { setShowUploadModal(false); setNewFile(null); setNewFileDescription(''); setUploadProgress(''); }}
                  style={{
                    flex: 1, padding: "12px", background: "#f1f5f9",
                    color: "#64748b", borderRadius: 14, fontWeight: 600,
                    fontSize: 14, cursor: "pointer", border: "none",
                  }}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!newFile || uploading}
                  style={{
                    flex: 1, padding: "12px",
                    background: (!newFile || uploading) ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)",
                    color: "white", borderRadius: 14, fontWeight: 700,
                    fontSize: 14, cursor: (!newFile || uploading) ? "not-allowed" : "pointer",
                    border: "none",
                    boxShadow: (!newFile || uploading) ? "none" : "0 4px 16px rgba(30,58,95,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {uploading ? (
                    <>
                      <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                      جاري الرفع...
                    </>
                  ) : (
                    <>
                      <Upload style={{ width: 16, height: 16 }} />
                      رفع الملف
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
