import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import dynamic from "next/dynamic";
import "./globals.css";

const InAppBrowserBanner = dynamic(() => import("@/components/InAppBrowserBanner"), { ssr: false });

export const metadata: Metadata = {
  title: "الشامل ⚖️ — المنصة القانونية الذكية في الجزائر",
  description: "المرجع القانوني الشامل للمحامي الجزائري — اختصاص المحاكم، القوانين، الأدوات القانونية. تطوير الأستاذ سايج محمد محامٍ لدى مجلس قضاء الجزائر",
  keywords: ["الجزائر", "القضاء", "المجالس القضائية", "المحاكم", "البلديات", "الاختصاص الإقليمي"],
  authors: [{ name: "الأستاذ سايج محمد" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "الشامل ⚖️",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "الشامل ⚖️ — المنصة القانونية الذكية في الجزائر",
    description: "المرجع القانوني الشامل للمحامي الجزائري — تطوير الأستاذ سايج محمد",
    type: "website",
    locale: "ar_DZ",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a3a5c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('SW registered: ', registration.scope);
                    },
                    function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground font-['Noto_Sans_Arabic',sans-serif]">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <InAppBrowserBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
