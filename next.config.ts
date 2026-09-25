import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/* ترويسات أمان عامة. سياسة CSP الكاملة تُضاف في مرحلة الصقل (Phase 16)
   بعد معرفة كل المصادر الفعلية (Firebase، R2، Chargily). */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // مؤشر التطوير العائم يغطي أزرار الزاوية (مثل إرسال الرسالة) أثناء التطوير
  devIndicators: false,
  images: {
    // الصور المحسّنة تُقدَّم جاهزة من `public/brand` (مولّدة بـ npm run brand)،
    // فلا نحتاج خدمة تحسين صور على الخادم — يبقى النشر محمولًا ومجانيًا.
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);

// يتيح استعمال ربط Cloudflare أثناء `next dev` دون التأثير على البناء
initOpenNextCloudflareForDev();
