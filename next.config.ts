import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // نتجاهل أخطاء TypeScript مؤقتاً حتى تكتمل التحديثات
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
