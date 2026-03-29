'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  FolderOpen,
  Search,
  Trash2,
  Eye,
  File,
  X,
  Download,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  date: string;
  category: string;
}

const categories = [
  { id: 'all', label: 'الكل', count: 0, color: 'bg-sky-500' },
  { id: 'civil', label: 'قانون مدني', count: 0, color: 'bg-blue-500' },
  { id: 'criminal', label: 'قانون جنائي', count: 0, color: 'bg-red-500' },
  { id: 'family', label: 'قانون أسرة', count: 0, color: 'bg-purple-500' },
  { id: 'commercial', label: 'قانون تجاري', count: 0, color: 'bg-emerald-500' },
  { id: 'labor', label: 'قانون عمل', count: 0, color: 'bg-amber-500' },
];

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 بايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function Library() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newFiles: UploadedFile[] = Array.from(fileList).map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      date: new Date().toLocaleDateString('ar-DZ'),
      category: categories[Math.floor(Math.random() * (categories.length - 1)) + 1].id,
    }));

    // Simulate upload progress
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles((prev) => [...newFiles, ...prev]);
        setUploadProgress(null);
        toast.success(`تم رفع ${newFiles.length} ملف بنجاح`);
      }
      setUploadProgress(progress);
    }, 200);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const deleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setPreviewFile(null);
    toast.success('تم حذف الملف');
  };

  const filteredFiles = files.filter((f) => {
    const matchesCategory = activeCategory === 'all' || f.category === activeCategory;
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4 px-4 pt-4 pb-4">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold text-foreground">المكتبة القانونية 📚</h2>
        <p className="text-sm text-muted-foreground">
          ارفع ونظّم ملفاتك القانونية في مكان واحد
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          animate-fade-in stagger-1 cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200
          ${
            isDragOver
              ? 'border-sky-400 bg-sky-500/10'
              : 'border-white/10 hover:border-sky-500/40 hover:bg-white/5'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.rtf"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
        {uploadProgress !== null ? (
          <div className="space-y-3">
            <div className="animate-pulse-gentle">
              <Upload className="mx-auto h-8 w-8 text-sky-400" />
            </div>
            <p className="text-sm font-medium text-sky-400">جارٍ الرفع...</p>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        ) : (
          <>
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              اضغط هنا أو اسحب الملفات لرفعها
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              يدعم PDF, Word, TXT
            </p>
          </>
        )}
      </div>

      {/* Search & Categories */}
      <div className="animate-fade-in stagger-2 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث في الملفات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 text-right"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200
                ${
                  activeCategory === cat.id
                    ? 'bg-sky-500/20 text-sky-400'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }
              `}
            >
              <div className={`h-2 w-2 rounded-full ${cat.color}`} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Files List */}
      <div className="animate-fade-in stagger-3 space-y-2">
        {filteredFiles.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <FolderOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              لا توجد ملفات حالياً
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              ارفع ملفاتك القانونية للبدء
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto no-scrollbar">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="glass group flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-white/10"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                  <FileText className="h-5 w-5 text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {file.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                    <span className="text-xs text-muted-foreground/40">•</span>
                    <span className="text-xs text-muted-foreground">
                      {file.date}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPreviewFile(file)}
                  >
                    <Eye className="h-4 w-4 text-sky-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteFile(file.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl p-6 animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">معاينة الملف</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPreviewFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/10">
                  <File className="h-6 w-6 text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {previewFile.name}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(previewFile.size)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {previewFile.date}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-2 bg-sky-500 hover:bg-sky-600">
                  <Download className="h-4 w-4" />
                  تحميل
                </Button>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => deleteFile(previewFile.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  حذف
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
