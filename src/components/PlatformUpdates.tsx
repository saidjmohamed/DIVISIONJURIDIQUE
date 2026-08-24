'use client';

import { useEffect, useState } from 'react';

type Update = {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  created_at: string;
};

export default function PlatformUpdates() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/platform-updates', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setUpdates(j.data || []))
      .catch(() => setUpdates([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section dir="rtl" className="space-y-4">
      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
        <h2 className="text-xl font-black text-[#1a3a5c] dark:text-blue-200">🆕 آخر تحديثات المنصة</h2>
        <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
          هنا تجد آخر الإضافات والتحسينات التي تمت على منصة الشامل القانوني. هذه الصفحة خاصة بتطورات المنصة نفسها وليست قسمًا للمستجدات القانونية.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border p-6 text-center text-sm text-gray-500">جارٍ تحميل آخر التحديثات...</div>
      ) : updates.length === 0 ? (
        <div className="rounded-2xl border p-6 text-center text-sm text-gray-500">لا توجد تحديثات منشورة حاليًا.</div>
      ) : (
        <div className="space-y-3">
          {updates.map((item) => (
            <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-900">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl dark:bg-blue-950/40">{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{item.title}</h3>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">{item.category}</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">{item.description}</p>
                  <time className="mt-2 block text-[11px] text-gray-400" dateTime={item.created_at}>
                    {new Intl.DateTimeFormat('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at))}
                  </time>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
