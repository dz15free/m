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

export type CheckoutInfo = {
  status: string;
  paymentMethod: string | null;
  livemode: boolean | null;
  amount: number | null;
  fees: number | null;
  updatedAt: string | null;
  /** حقول خطأ إن أرسلها Chargily (لا يوثّقها: السبب البنكي الدقيق لا يصل عادة) */
  reason: string | null;
  customer: { name: string; email: string; phone: string } | null;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : null);
/** سبب الفشل إن وُجد في كائن Chargily بأي اسم شائع. */
export function reasonOf(x: Record<string, unknown> | null | undefined): string | null {
  if (!x) return null;
  for (const k of ["failure_reason", "failure_message", "error_message", "error", "reason", "message", "response_message"]) {
    const v = x[k];
    if (str(v)) return str(v);
    if (v && typeof v === "object" && str((v as Record<string, unknown>).message)) return str((v as Record<string, unknown>).message);
  }
  return null;
}

async function getJson(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${apiBase()}${path}`, { headers: { Authorization: `Bearer ${secret()}`, Accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new HttpError(502, "payment provider error");
  return (await res.json()) as Record<string, unknown>;
}

/** حالة صفحة دفع من Chargily مع بيانات الزبون (الاسم، البريد، الهاتف كما كتبها في الصفحة). */
export async function getCheckoutInfo(checkoutId: string): Promise<CheckoutInfo | null> {
  if (!/^[\w-]{1,100}$/.test(checkoutId)) return null;
  const c = await getJson(`/checkouts/${checkoutId}`);
  if (!c) return null;
  const customerId = str(c.customer_id);
  const cu = customerId && /^[\w-]{1,100}$/.test(customerId) ? await getJson(`/customers/${customerId}`).catch(() => null) : null;
  return {
    status: str(c.status) ?? "unknown",
    paymentMethod: str(c.payment_method),
    livemode: typeof c.livemode === "boolean" ? c.livemode : null,
    amount: typeof c.amount === "number" ? c.amount : null,
    fees: typeof c.fees === "number" ? c.fees : null,
    updatedAt: typeof c.updated_at === "number" ? new Date(c.updated_at * 1000).toISOString() : str(c.updated_at),
    reason: reasonOf(c),
    customer: cu ? { name: str(cu.name) ?? "", email: str(cu.email) ?? "", phone: str(cu.phone) ?? "" } : null,
  };
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
