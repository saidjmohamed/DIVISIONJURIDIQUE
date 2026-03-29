'use client';

import {
  Home,
  BookOpen,
  FileText,
  Search,
  Brain,
  HelpCircle,
} from 'lucide-react';

export type TabId = 'home' | 'library' | 'tools' | 'search' | 'ai' | 'quiz';

export interface TabItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const tabs: TabItem[] = [
  { id: 'home', label: 'الرئيسية', icon: Home },
  { id: 'library', label: 'المكتبة', icon: BookOpen },
  { id: 'tools', label: 'أدوات PDF', icon: FileText },
  { id: 'search', label: 'بحث', icon: Search },
  { id: 'ai', label: 'مساعد ذكي', icon: Brain },
  { id: 'quiz', label: 'اختبار', icon: HelpCircle },
];

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="glass border-t border-white/10">
        <div className="flex items-center justify-around px-1 py-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-1.5
                  transition-all duration-200 min-w-0 flex-1
                  ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-400'
                      : 'text-muted-foreground hover:text-foreground/80'
                  }
                `}
              >
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive ? 'scale-110' : ''
                  }`}
                />
                <span
                  className={`text-[10px] leading-tight font-medium ${
                    isActive ? 'text-sky-400' : ''
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 h-0.5 w-8 rounded-full bg-sky-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
