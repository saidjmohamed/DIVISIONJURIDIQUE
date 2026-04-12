'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { extractTextFromFile } from '@/lib/extract-text';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, CheckCircle2, AlertTriangle, FileText, Upload, ArrowRight, Printer, Copy, Trash2, Info
} from 'lucide-react';
import { toast } from 'sonner';
import legalRules from '@/data/legal-rules.json';

/* ─────────────────────── Types ─────────────────────── */

interface CheckResult {
  id: string;
  label: string;
  article: string;
  status: 'pass' | 'fail' | 'warning' | 'not_found';
  critical: boolean;
  details: string;
  note?: string;
}

interface AnalysisReport {
  docType: string;
  court: string;
  date: string;
  result: 'accepted' | 'rejected' | 'needs_review';
  checks: CheckResult[];
  recommendations: string[];
}

/* ─────────────────────── Component ─────────────────────── */

export default function FormalPetitionChecker({ onBack }: { onBack: () => void }) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function performAnalysis(text: string, typeId: string): AnalysisReport {
    const allChecks: CheckResult[] = [];
    
    // 1. Common Rules
    legalRules.commonRules.forEach(rule => {
      const found = rule.keywords.some(kw => text.includes(kw));
      allChecks.push({
        id: rule.id,
        label: rule.label,
        article: rule.article,
        status: found ? 'pass' : (rule.critical ? 'fail' : 'warning'),
        critical: rule.critical,
        details: found ? `تم العثور على إشارة لـ ${rule.label}` : `لم يتم العثور على ${rule.label} بشكل واضح.`
      });
    });

    // 2. Specific Rules
    const specific = (legalRules.specificRules as any)[typeId] || [];
    specific.forEach((rule: any) => {
      const found = rule.keywords.some((kw: string) => text.includes(kw));
      allChecks.push({
        id: rule.id,
        label: rule.label,
        article: rule.article,
        status: found ? 'pass' : (rule.critical ? 'fail' : 'warning'),
        critical: rule.critical,
        details: found ? `تم استيفاء شرط: ${rule.label}` : `نقص في: ${rule.label}`,
        note: rule.note
      });
    });

    // Extract basic info
    const courtMatch = text.match(/(محكمة|المجلس القضائي|مجلس قضاء)\s+([^\s\n]+)/);
    const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4})/);
    
    const criticalFails = allChecks.filter(c => c.critical && c.status === 'fail');
    const warnings = allChecks.filter(c => c.status === 'warning');
    
    let result: 'accepted' | 'rejected' | 'needs_review' = 'accepted';
    if (criticalFails.length > 0) result = 'rejected';
    else if (warnings.length > 0) result = 'needs_review';

    // Find doc type label
    let docTypeLabel = typeId;
    legalRules.categories.forEach(cat => {
      const t = cat.types.find(t => t.id === typeId);
      if (t) docTypeLabel = t.label;
    });

    return {
      docType: docTypeLabel,
      court: courtMatch ? courtMatch[0] : 'غير ظاهرة',
      date: dateMatch ? dateMatch[0] : 'غير مذكورة',
      result,
      checks: allChecks,
      recommendations: allChecks
        .filter(c => c.status !== 'pass')
        .map(c => `إضافة أو تصحيح: ${c.label} (${c.article})`)
    };
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedType) {
      toast.error('يرجى اختيار نوع الوثيقة أولاً');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    const isWord = file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc');
    if (!isWord) {
      toast.error('هذه الأداة تقبل ملفات Word فقط (.docx / .doc)');
      return;
    }

    setFileName(file.name);
    setIsAnalyzing(true);
    setReport(null);

    try {
      const text = await extractTextFromFile(file);

      // Simulate AI Analysis based on rules
      setTimeout(() => {
        const analysis = performAnalysis(text, selectedType);
        setReport(analysis);
        setIsAnalyzing(false);
        toast.success('اكتمل الفحص الشكلي بنجاح');
      }, 1500);

    } catch (error) {
      console.error(error);
      toast.error('فشل في تحليل الملف. تأكد من أنه ملف Word صالح.');
      setIsAnalyzing(false);
    }
  }, [selectedType]);



  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    },
    multiple: false
  });


  const reset = () => {
    setReport(null);
    setFileName(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowRight className="w-4 h-4" /> عودة للأدوات
        </Button>
        <h2 className="text-xl font-bold text-[#1a3a5c]">أداة الفحص الشكلي للعرائض</h2>
      </div>

      {!report ? (
        <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" /> تعليمات الاستخدام
            </CardTitle>
            <CardDescription>
              اختر نوع الوثيقة أولاً، ثم ارفع ملف Word (.docx) لفحصه شكلياً وفق القانون الجزائري.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع الوثيقة القانونية:</label>
              <Select onValueChange={setSelectedType} value={selectedType}>
                <SelectTrigger className="w-full text-right">
                  <SelectValue placeholder="اختر نوع الوثيقة..." />
                </SelectTrigger>
                <SelectContent>
                  {legalRules.categories.map(cat => (
                    <div key={cat.id}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-gray-900">{cat.label}</div>
                      {cat.types.map(type => (
                        <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div 
              {...getRootProps()} 
              className={`
                border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
                ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 hover:border-blue-400'}
                ${!selectedType ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input {...getInputProps()} disabled={!selectedType} />
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-blue-100 dark:bg-blue-900/40 rounded-full text-blue-600">
                  <Upload className="w-8 h-8" />
                </div>
                {isAnalyzing ? (
                  <div className="space-y-2">
                    <p className="font-bold animate-pulse">جاري تحليل الوثيقة...</p>
                    <p className="text-xs text-gray-500">يتم الفحص وفق المراجع القانونية المحدثة 2025</p>
                  </div>
                ) : (
                  <>
                    <p className="font-bold">اسحب ملف Word هنا أو انقر للاختيار</p>
                    <p className="text-xs text-gray-500">يدعم فقط ملفات .docx و .doc</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Report Header */}
          <Card className="overflow-hidden border-t-4 border-t-[#1a3a5c]">
            <CardContent className="p-0">
              <div className="bg-gray-50 dark:bg-gray-900 p-6 text-center border-b">
                <h3 className="text-xl font-black mb-1">تقرير الفحص الشكلي</h3>
                <p className="text-sm text-gray-500">تطبيق الشامل | تبويب الأدوات</p>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">📄 نوع الوثيقة</span>
                  <span className="font-bold">{report.docType}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">⚖️ الجهة القضائية</span>
                  <span className="font-bold">{report.court}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">📅 تاريخ التحرير</span>
                  <span className="font-bold">{report.date}</span>
                </div>
              </div>

              <div className="p-8 text-center bg-white dark:bg-gray-800">
                <div className="mb-4">النتيجة الشكلية النهائية:</div>
                {report.result === 'accepted' && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-6 py-2 text-lg gap-2 border-green-200">
                    <CheckCircle2 className="w-5 h-5" /> مقبول شكلاً
                  </Badge>
                )}
                {report.result === 'needs_review' && (
                  <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 px-6 py-2 text-lg gap-2 border-yellow-200">
                    <AlertTriangle className="w-5 h-5" /> ناقص شكلاً ويحتاج استكمال
                  </Badge>
                )}
                {report.result === 'rejected' && (
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100 px-6 py-2 text-lg gap-2 border-red-200">
                    <AlertCircle className="w-5 h-5" /> مرفوض شكلاً
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> الشروط المستوفاة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.checks.filter(c => c.status === 'pass').map(check => (
                  <div key={check.id} className="text-xs p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-100 dark:border-green-800">
                    <div className="font-bold">{check.label}</div>
                    <div className="text-gray-500 mt-1">{check.article}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" /> الشروط غير المستوفاة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.checks.filter(c => c.status === 'fail' || c.status === 'warning').map(check => (
                  <div key={check.id} className={`text-xs p-2 rounded border ${check.status === 'fail' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-yellow-50 border-yellow-100 text-yellow-700'}`}>
                    <div className="font-bold">{check.label}</div>
                    <div className="mt-1">{check.article} — {check.status === 'fail' ? 'جوهري' : 'قابل للتدارك'}</div>
                    {check.note && <div className="mt-1 italic opacity-80">🔍 {check.note}</div>}
                  </div>
                ))}
                {report.checks.filter(c => c.status === 'fail' || c.status === 'warning').length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-4">لا توجد نقائص شكلية مكتشفة</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">✏️ اقتراحات التنقيح الشكلي</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{rec}</li>
                ))}
                {report.recommendations.length === 0 && (
                  <li className="text-green-600">الوثيقة ممتازة شكلياً، لا توجد اقتراحات حالياً.</li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Footer Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> طباعة التقرير
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(report, null, 2));
              toast.success('تم نسخ التقرير للحافظة');
            }}>
              <Copy className="w-4 h-4" /> نسخ التقرير
            </Button>
            <Button variant="destructive" className="gap-2" onClick={reset}>
              <Trash2 className="w-4 h-4" /> حذف البيانات والبدء من جديد
            </Button>
          </div>

          <div className="text-[10px] text-gray-400 text-center space-y-1">
            <p>⚠️ تنبيه قانوني: هذه الأداة مخصصة للفحص الشكلي الأولي ولا تغني عن مراجعة المحامي.</p>
            <p>🔒 الخصوصية: يتم حذف محتوى الملف فور انتهاء المعالجة ولا يتم تخزينه.</p>
          </div>
        </div>
      )}
    </div>
  );
}
