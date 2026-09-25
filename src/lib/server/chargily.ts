import "server-only";
import { HttpError, usingEmulators } from "./auth";
import { serverEnv } from "./env";

/* Chargily Pay V2 عبر REST مباشرة (fetch + Web Crypto) — يعمل على Workers بلا حزمة Node.
   المفتاح السري Worker secret فقط (CHARGILY_SECRET_KEY)؛ الوضع (test/live) من بادئته. */

function secret(): string {
  const key = serverEnv().CHARGILY_SECRET_KEY;
  if (!key) throw new HttpError(503, "payments not configured");
  // خطأ شائع: وضع المفتاح العام (pk) بدل السري (sk)
  if (!/^(test|live)_sk_/.test(key) && !usingEmulators()) {
    console.error("[chargily] CHARGILY_SECRET_KEY must be the secret key (test_sk_… / live_sk_…), not the public key");
    throw new HttpError(503, "payments misconfigured");
  }
  return key;
}

export const chargilyMode = (): "test" | "live" => (secret().startsWith("live_") ? "live" : "test");

function apiBase(): string {
  // للاختبار المحلي فقط: خادم Chargily وهمي
  if (usingEmulators() && process.env.CHARGILY_API_BASE) return process.env.CHARGILY_API_BASE;
  return chargilyMode() === "live" ? "https://pay.chargily.net/api/v2" : "https://pay.chargily.net/test/api/v2";
}

export type CheckoutRequest = {
  amount: number;
  successUrl: string;
  failureUrl: string;
  webhookUrl: string;
  locale: "ar" | "fr" | "en";
  description: string;
  metadata: Record<string, string>;
};

export async function createCheckout(req: CheckoutRequest): Promise<{ id: string; checkoutUrl: string }> {
  const res = await fetch(`${apiBase()}/checkouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      amount: req.amount,
      currency: "dzd",
      success_url: req.successUrl,
      failure_url: req.failureUrl,
      webhook_endpoint: req.webhookUrl,
      locale: req.locale,
      description: req.description,
      metadata: req.metadata,
    }),
  });
  if (!res.ok) {
    console.error("[chargily] checkout failed", res.status, (await res.text()).slice(0, 300));
    throw new HttpError(502, "payment provider error");
  }
  const body = (await res.json()) as { id: string; checkout_url: string };
  return { id: body.id, checkoutUrl: body.checkout_url };
}

/** توقيع الـ webhook: HMAC-SHA256 للجسم الخام بالمفتاح السري، ومقارنة بزمن ثابت. */
export async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(expected, signature.toLowerCase());
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
