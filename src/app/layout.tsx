import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "الشامل - منصة القانون الجزائري",
  description: "منصة شاملة للقانون الجزائري مع مساعد ذكي بالذكاء الاصطناعي",
  keywords: ["قانون", "جزائري", "الشامل", "مساعد ذكي", "قانون الجزائر"],
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-512.png",
  },
  openGraph: {
    title: "الشامل - منصة القانون الجزائري",
    description: "منصة شاملة للقانون الجزائري مع مساعد ذكي",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0ea5e9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className="dark">
      <body
        className={`${cairo.variable} font-[family-name:var(--font-cairo)] antialiased`}
      >
        {children}
        <Toaster
          position="top-center"
          dir="rtl"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "var(--font-cairo), sans-serif",
              direction: "rtl",
            },
          }}
        />
      </body>
    </html>
  );
}
