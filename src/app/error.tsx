'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center" dir="rtl">
      <span className="text-5xl">⚠️</span>
      <h2 className="text-xl font-bold text-[#1a3a5c]">حدث خطأ غير متوقع</h2>
      <p className="text-gray-500 text-sm">{error.message}</p>
      <button onClick={reset} className="px-6 py-3 bg-[#1a3a5c] text-white rounded-xl font-medium">
        إعادة المحاولة
      </button>
    </div>
  );
}
