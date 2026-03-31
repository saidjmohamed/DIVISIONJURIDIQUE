"use client";

import dynamic from "next/dynamic";

const InAppBrowserBanner = dynamic(() => import("./InAppBrowserBanner"), {
  ssr: false,
});

export default function InAppBrowserBannerWrapper() {
  return <InAppBrowserBanner />;
}
