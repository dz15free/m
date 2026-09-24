import "server-only";
import { z } from "zod";

/* متغيّرات الخادم السرّية. `server-only` يجعل استيراد هذا الملف من كود
   المتصفح خطأ بناء، فلا يمكن أن يتسرّب سرّ إلى الواجهة ولو بالخطأ.
   كل متغيّر اختياري هنا لأنه يُستعمل في مرحلته؛ الدوال التي تحتاجه
   تستدعي requireEnv فتفشل برسالة واضحة إن كان ناقصًا. */
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  FIREBASE_SERVICE_ACCOUNT: z.string().min(1).optional(),
  CHARGILY_SECRET_KEY: z.string().startsWith("test_sk_").or(z.string().startsWith("live_sk_")).optional(),
  CHARGILY_MODE: z.enum(["test", "live"]).default("test"),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
});

type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

export function requireEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = serverEnv()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing server environment variable: ${String(key)}`);
  }
  return value as NonNullable<ServerEnv[K]>;
}

export function siteUrl(): string {
  return serverEnv().NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
}
