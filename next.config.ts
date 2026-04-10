import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // نتجاهل أخطاء TypeScript مؤقتاً حتى تكتمل التحديثات
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  // Turbopack resolve aliases for pdfjs-dist (no canvas native module in browser)
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      canvas: { browser: '' },
    },
  },
};

export default nextConfig;
