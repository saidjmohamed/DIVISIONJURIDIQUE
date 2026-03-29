'use client';

import { useState, useRef } from 'react';
import {
  Merge,
  Split,
  FileDown,
  FileUp,
  Droplets,
  Lock,
  ArrowLeft,
  Upload,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface PdfTool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
}

const pdfTools: PdfTool[] = [
  {
    id: 'merge',
    name: 'دمج ملفات PDF',
    description: 'ادمج عدة ملفات PDF في ملف واحد',
    icon: Merge,
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-blue-700',
  },
  {
    id: 'split',
    name: 'تقسيم PDF',
    description: 'قسّم ملف PDF إلى عدة أجزاء',
    icon: Split,
    color: 'text-emerald-400',
    gradient: 'from-emerald-500 to-emerald-700',
  },
  {
    id: 'compress',
    name: 'ضغط PDF',
    description: 'قلّص حجم ملف PDF مع الحفاظ على الجودة',
    icon: FileDown,
    color: 'text-amber-400',
    gradient: 'from-amber-500 to-amber-700',
  },
  {
    id: 'convert',
    name: 'تحويل إلى PDF',
    description: 'حوّل الصور والمستندات إلى PDF',
    icon: FileUp,
    color: 'text-purple-400',
    gradient: 'from-purple-500 to-purple-700',
  },
  {
    id: 'watermark',
    name: 'إضافة علامة مائية',
    description: 'أضف علامة مائية على ملفات PDF',
    icon: Droplets,
    color: 'text-sky-400',
    gradient: 'from-sky-500 to-sky-700',
  },
  {
    id: 'password',
    name: 'حماية بكلمة مرور',
    description: 'أمّن ملفات PDF بكلمة مرور',
    icon: Lock,
    color: 'text-rose-400',
    gradient: 'from-rose-500 to-rose-700',
  },
];

export default function PdfTools() {
  const [selectedTool, setSelectedTool] = useState<PdfTool | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setCompleted(false);
    }
  };

  const handleProcess = () => {
    if (files.length === 0) {
      toast.error('يرجى اختيار ملف أولاً');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setCompleted(false);

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setProcessing(false);
        setCompleted(true);
        toast.success('تمت المعالجة بنجاح!');
      }
      setProgress(p);
    }, 300);
  };

  const handleReset = () => {
    setSelectedTool(null);
    setFiles([]);
    setProcessing(false);
    setProgress(0);
    setCompleted(false);
  };

  if (selectedTool) {
    const Icon = selectedTool.icon;
    return (
      <div className="space-y-4 px-4 pt-4 pb-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleReset}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {selectedTool.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {selectedTool.description}
            </p>
          </div>
        </div>

        {/* Tool Icon */}
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${selectedTool.gradient} shadow-lg mx-auto`}
        >
          <Icon className="h-8 w-8 text-white" />
        </div>

        {/* Upload Area */}
        <div
          onClick={() => !processing && fileInputRef.current?.click()}
          className={`
            cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all
            ${processing ? 'opacity-50 cursor-not-allowed' : 'hover:border-sky-500/40 hover:bg-white/5'}
            border-white/10
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
            onChange={handleFileSelect}
            disabled={processing}
          />
          <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {files.length > 0
              ? `تم اختيار ${files.length} ملف`
              : 'اختر الملفات المراد معالجتها'}
          </p>
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((f, i) => (
                <p key={i} className="text-xs text-muted-foreground truncate">
                  {f.name}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Progress */}
        {processing && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">جارٍ المعالجة...</span>
              <span className="text-sky-400 font-medium">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Completed */}
        {completed && (
          <div className="animate-slide-up rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
            <Check className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-400">
              تمت المعالجة بنجاح!
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            className="flex-1 gap-2 bg-sky-500 hover:bg-sky-600"
            onClick={handleProcess}
            disabled={processing || files.length === 0}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ المعالجة...
              </>
            ) : (
              <>
                <Icon className="h-4 w-4" />
                بدء المعالجة
              </>
            )}
          </Button>
          {completed && (
            <Button variant="outline" className="gap-2">
              <FileDown className="h-4 w-4" />
              تحميل
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-4 pb-4">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold text-foreground">أدوات PDF 🔧</h2>
        <p className="text-sm text-muted-foreground">
          أدوات متقدمة لمعالجة ملفاتك القانونية
        </p>
      </div>

      {/* Tool Cards */}
      <div className="grid grid-cols-2 gap-3">
        {pdfTools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool)}
              className={`
                glass group rounded-2xl p-4 text-right transition-all duration-300
                hover:scale-[1.02] active:scale-[0.98]
                animate-fade-in stagger-${index + 1}
              `}
            >
              <div
                className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.gradient} shadow-md transition-transform duration-200 group-hover:scale-110`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">
                {tool.name}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {tool.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
