import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/* ترويسات أمان عامة. CSP هنا تقيّد ما لا يحتاجه التطبيق إطلاقًا (التضمين في إطارات،
   الإضافات، تغيير base، إرسال النماذج لخارج الموقع). تقييد السكربتات بـ nonce يتطلّب
   تصييرًا ديناميكيًا لكل صفحة ويكسر تسجيل Google وOCR، فلم نفعّله. */
const isProd = process.env.NODE_ENV === "production";
const csp = ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", ...(isProd ? ["upgrade-insecure-requests"] : [])].join("; ");
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // نافذة تسجيل Google المنبثقة تحتاج الإبقاء على opener للنوافذ التي نفتحها
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
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
