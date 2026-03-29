'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  BookOpen,
  Calendar,
  Tag,
  X,
  Gavel,
  FileText,
  Scale,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: number;
  title: string;
  type: string;
  year: string;
  description: string;
  article?: string;
}

const mockResults: SearchResult[] = [
  {
    id: 1,
    title: 'القانون المدني الجزائري',
    type: 'قانون مدني',
    year: '1975',
    description: 'ينظم العلاقات المدنية بين الأشخاص ويحدد حقوقهم والتزاماتهم في المعاملات المدنية.',
    article: 'الأمر رقم 75-58',
  },
  {
    id: 2,
    title: 'قانون العقوبات الجزائري',
    type: 'قانون جنائي',
    year: '1966',
    description: 'يحدد الجرائم والعقوبات المطبقة في القانون الجزائري ويشمل الجنايات والجنح والمخالفات.',
    article: 'الأمر رقم 66-156',
  },
  {
    id: 3,
    title: 'قانون الأسرة الجزائري',
    type: 'قانون أسرة',
    year: '1984',
    description: 'ينظم العلاقات الأسرية بما في ذلك الزواج والطلاق والنفقة والميراث.',
    article: 'القانون رقم 84-11',
  },
  {
    id: 4,
    title: 'قانون العمل الجزائري',
    type: 'قانون عمل',
    year: '1990',
    description: 'ينظم علاقات العمل بين المشغل والأجير ويحدد حقوق وواجبات كل طرف.',
    article: 'القانون رقم 90-11',
  },
  {
    id: 5,
    title: 'القانون التجاري الجزائري',
    type: 'قانون تجاري',
    year: '1975',
    description: 'ينظم الأعمال التجارية والعلاقات بين التجار ويحدد أحكام الشركات التجارية.',
    article: 'الأمر رقم 75-59',
  },
  {
    id: 6,
    title: 'قانون الإجراءات المدنية والإدارية',
    type: 'إجراءات',
    year: '2008',
    description: 'يحدد قواعد التقاضي أمام المحاكم المدنية والإدارية وإجراءات الطعن.',
    article: 'القانون رقم 08-09',
  },
];

const lawTypes = [
  'الكل',
  'قانون مدني',
  'قانون جنائي',
  'قانون أسرة',
  'قانون عمل',
  'قانون تجاري',
  'إجراءات',
];

const lawIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'قانون مدني': Scale,
  'قانون جنائي': Gavel,
  'قانون أسرة': BookOpen,
  'قانون عمل': FileText,
  'قانون تجاري': BookOpen,
  'إجراءات': FileText,
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('الكل');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;

    const filtered = mockResults.filter((r) => {
      const matchesType = selectedType === 'الكل' || r.type === selectedType;
      const matchesQuery =
        r.title.includes(query) ||
        r.description.includes(query) ||
        r.type.includes(query);
      return matchesType && matchesQuery;
    });

    setResults(filtered);
    setHasSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const highlightText = (text: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="rounded bg-sky-500/30 px-0.5 text-sky-300">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-4 px-4 pt-4 pb-4">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold text-foreground">بحث متقدم 🔍</h2>
        <p className="text-sm text-muted-foreground">
          ابحث في القوانين والنصوص القانونية الجزائرية
        </p>
      </div>

      {/* Search Bar */}
      <div className="animate-fade-in stagger-1 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث عن قانون أو مادة..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-9 text-right"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setHasSearched(false);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button
            onClick={handleSearch}
            className="bg-sky-500 hover:bg-sky-600 px-5"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
          تصفية النتائج
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="animate-slide-down glass rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Tag className="h-4 w-4 text-sky-400" />
            نوع القانون
          </div>
          <div className="flex flex-wrap gap-2">
            {lawTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedType === type
                    ? 'bg-sky-500/20 text-sky-400'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && (
        <div className="animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {results.length} نتيجة
              {query && ` لـ "${query}"`}
            </p>
          </div>

          {results.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <Search className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                لا توجد نتائج
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                حاول البحث بكلمات مختلفة
              </p>
            </div>
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto no-scrollbar">
              {results.map((result) => {
                const LawIcon =
                  lawIcons[result.type] || FileText;
                return (
                  <div
                    key={result.id}
                    className="glass group rounded-xl p-4 transition-all duration-200 hover:bg-white/10 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                        <LawIcon className="h-5 w-5 text-sky-400" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <h3 className="text-sm font-bold text-foreground">
                          {highlightText(result.title)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-xs"
                          >
                            {highlightText(result.type)}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {result.year}
                          </div>
                          {result.article && (
                            <span className="text-xs text-sky-400/70">
                              {result.article}
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {highlightText(result.description)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Suggested Searches (when not searched) */}
      {!hasSearched && (
        <div className="animate-fade-in stagger-3 space-y-3">
          <p className="text-sm font-medium text-foreground">اقتراحات البحث</p>
          <div className="flex flex-wrap gap-2">
            {[
              'القانون المدني',
              'قانون الأسرة',
              'عقد العمل',
              'الطلاق',
              'الإيجار',
              'الشركات التجارية',
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  handleSearch();
                }}
                className="glass rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Popular Laws */}
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-foreground">قوانين شائعة</p>
            {mockResults.slice(0, 3).map((result) => {
              const LawIcon = lawIcons[result.type] || FileText;
              return (
                <div
                  key={result.id}
                  className="glass group flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-white/10 cursor-pointer"
                  onClick={() => {
                    setQuery(result.title);
                    handleSearch();
                  }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                    <LawIcon className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {result.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {result.type} • {result.year}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
