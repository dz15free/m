import "server-only";
import { importPKCS8, SignJWT } from "jose";
import { HttpError, usingEmulators } from "./auth";
import { serverEnv } from "./env";

/* كتابات الخادم بصلاحية المشرف (الاشتراكات، الدفع، سجل التدقيق) عبر Firestore REST.
   حساب الخدمة سرّ في Worker (`wrangler secret put FIREBASE_SERVICE_ACCOUNT`) ولا يصل للمتصفح.
   مع المحاكي نستعمل رمز "owner" الذي يتجاوز القواعد محليًا فقط. */

type Value = Record<string, unknown>;
export type Precondition = { exists: boolean } | { updateTime: string };
export type Write = { path: string; data: Record<string, unknown>; precondition?: Precondition };

const projectId = () => process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const docsRoot = () => `projects/${projectId()}/databases/(default)/documents`;
const apiBase = () =>
  usingEmulators() ? `http://${process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"}/v1` : "https://firestore.googleapis.com/v1";

let cached: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (usingEmulators()) return "owner";
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const raw = serverEnv().FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new HttpError(503, "server credentials not configured");
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };
  const key = await importPKCS8(sa.private_key, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/datastore" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`oauth ${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: body.access_token, exp: Date.now() + body.expires_in * 1000 };
  return cached.token;
}

// ── الترميز ──

export function encode(v: unknown): Value {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  if (typeof v === "object") return { mapValue: { fields: encodeFields(v as Record<string, unknown>) } };
  throw new Error("unsupported value");
}

const encodeFields = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, encode(v)]));

function decode(v: Value): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return Date.parse(String(v.timestampValue));
  if ("arrayValue" in v) return ((v.arrayValue as { values?: Value[] }).values ?? []).map(decode);
  if ("mapValue" in v) return decodeFields((v.mapValue as { fields?: Record<string, Value> }).fields ?? {});
  return undefined;
}
const decodeFields = (f: Record<string, Value>) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, decode(v)]));

// ── العمليات ──

export async function adminGet(path: string): Promise<{ data: Record<string, unknown>; updateTime: string } | null> {
  const res = await fetch(`${apiBase()}/${docsRoot()}/${path}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore get ${res.status}`);
  const body = (await res.json()) as { fields?: Record<string, Value>; updateTime: string };
  return { data: decodeFields(body.fields ?? {}), updateTime: body.updateTime };
}

/** كتابات ذرّية (كلها أو لا شيء). شرط مسبق فاشل ⇒ HttpError 409. */
export async function adminCommit(writes: Write[]): Promise<void> {
  const res = await fetch(`${apiBase()}/${docsRoot()}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      writes: writes.map((w) => ({
        update: { name: `${docsRoot()}/${w.path}`, fields: encodeFields(w.data) },
        ...(w.precondition ? { currentDocument: w.precondition } : {}),
      })),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 409 || /FAILED_PRECONDITION|ALREADY_EXISTS|NOT_FOUND/.test(text)) throw new HttpError(409, "conflict");
    throw new Error(`firestore commit ${res.status}`);
  }
}

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
