'use client';

import type { TabId } from '@/components/BottomNav';
import {
  BookOpen,
  Brain,
  FileText,
  HelpCircle,
  Search,
  Scale,
  TrendingUp,
  Lightbulb,
  ArrowLeft,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (tab: TabId) => void;
}

const quickAccess = [
  { id: 'library' as TabId, label: 'المكتبة القانونية', icon: BookOpen, color: 'from-blue-500 to-blue-700' },
  { id: 'ai' as TabId, label: 'المساعد الذكي', icon: Brain, color: 'from-purple-500 to-purple-700' },
  { id: 'tools' as TabId, label: 'أدوات PDF', icon: FileText, color: 'from-emerald-500 to-emerald-700' },
  { id: 'search' as TabId, label: 'بحث متقدم', icon: Search, color: 'from-amber-500 to-amber-700' },
  { id: 'quiz' as TabId, label: 'اختبار قانوني', icon: HelpCircle, color: 'from-rose-500 to-rose-700' },
];

const stats = [
  { label: 'قانون مدمج', value: '+150', icon: Scale },
  { label: 'مادة قانونية', value: '+5000', icon: BookOpen },
  { label: 'مستخدم نشط', value: '+10K', icon: TrendingUp },
];

const features = [
  {
    icon: Brain,
    title: 'مساعد ذكي بالذكاء الاصطناعي',
    desc: 'احصل على إجابات فورية لجميع أسئلتك القانونية',
    color: 'text-purple-400',
  },
  {
    icon: FileText,
    title: 'أدوات PDF متقدمة',
    desc: 'دمج وتقسيم وضغط وحماية ملفاتك القانونية',
    color: 'text-emerald-400',
  },
  {
    icon: Shield,
    title: 'اختبارات قانونية',
    desc: 'اختبر معلوماتك في مختلف فروع القانون',
    color: 'text-rose-400',
  },
  {
    icon: Zap,
    title: 'بحث سريع',
    desc: 'ابحث في القوانين والنصوص القانونية بسهولة',
    color: 'text-amber-400',
  },
];

const dailyTips = [
  'وفقاً للمادة 1 من القانون المدني الجزائري، يسري القانون على جميع الأشخاص الذين يوجدون في الجزائر وعلى أحوالهم الشخصية إذا كانوا جزائريين.',
  'مهلة الطعن بالاستئناف في المواد المدنية هي 30 يوماً من تاريخ التبليغ وفقاً لقانون الإجراءات المدنية والإدارية.',
  'يحق للموظف الجزائري الحصول على إجازة سنوية مدتها 30 يوماً عملاً وفقاً لقانون الوظيفة العمومية.',
];

export default function HomePage({ onNavigate }: HomePageProps) {
  const randomTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? 'صباح الخير'
      : currentHour < 18
        ? 'مساء الخير'
        : 'مساء الخير';

  return (
    <div className="space-y-6 px-4 pt-4 pb-4">
      {/* Welcome Section */}
      <div className="animate-fade-in rounded-2xl bg-gradient-to-l from-sky-500 via-blue-600 to-indigo-700 p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-sky-100">{greeting} 👋</p>
            <h2 className="text-xl font-bold text-white">
              مرحباً بك في الشامل
            </h2>
            <p className="text-sm leading-relaxed text-sky-100/90">
              منصتك الشاملة للقانون الجزائري مع مساعد ذكي بالذكاء الاصطناعي
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span className="text-xs font-medium text-white">
                مساعد ذكي جاهز للإجابة على أسئلتك
              </span>
              <ArrowLeft className="mr-auto h-4 w-4 text-white/70" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="animate-fade-in stagger-1 grid grid-cols-3 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="glass rounded-xl p-3 text-center"
            >
              <Icon className="mx-auto mb-1.5 h-5 w-5 text-sky-400" />
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Access */}
      <div className="animate-fade-in stagger-2 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          وصول سريع
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {quickAccess.slice(0, 3).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="glass group flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} shadow-md transition-transform duration-200 group-hover:scale-110`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-foreground/90">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickAccess.slice(3).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="glass group flex items-center gap-3 rounded-xl p-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} shadow-md`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground/90">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Legal Tip */}
      <div className="animate-fade-in stagger-3 space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">
            نصيحة قانونية اليوم
          </h3>
        </div>
        <div className="glass rounded-xl p-4 border-r-4 border-amber-400/50">
          <p className="text-sm leading-relaxed text-foreground/80">
            {randomTip}
          </p>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="animate-fade-in stagger-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          مميزات التطبيق
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="glass rounded-xl p-4 transition-all duration-200 hover:bg-white/10"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                    <Icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {feature.title}
                    </h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
