import "server-only";
import { importPKCS8, SignJWT } from "jose";
import { HttpError, usingEmulators } from "./auth";
import { serverEnv } from "./env";

/* كتابات الخادم بصلاحية المشرف (الاشتراكات، الدفع، سجل التدقيق) عبر Firestore REST.
   حساب الخدمة سرّ في Worker (`wrangler secret put FIREBASE_SERVICE_ACCOUNT`) ولا يصل للمتصفح.
   مع المحاكي نستعمل رمز "owner" الذي يتجاوز القواعد محليًا فقط. */

type Value = Record<string, unknown>;
export type Precondition = { exists: boolean } | { updateTime: string };
export type Write = {
  path: string;
  data: Record<string, unknown>;
  /** دمج الحقول المذكورة فقط (بدل استبدال الوثيقة كاملة) */
  merge?: boolean;
  /** زيادات ذرّية: { "gross": 1500, "byMethod.chargily": 1 } */
  increments?: Record<string, number>;
  precondition?: Precondition;
};

const projectId = () => process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const docsRoot = () => `projects/${projectId()}/databases/(default)/documents`;
const apiBase = () =>
  usingEmulators() ? `http://${process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"}/v1` : "https://firestore.googleapis.com/v1";

const cached = new Map<string, { token: string; exp: number }>();
const DATASTORE = "https://www.googleapis.com/auth/datastore";

/** رمز OAuth لحساب الخدمة بالنطاق المطلوب (Firestore أو إدارة الحسابات). */
export async function accessToken(scope = DATASTORE): Promise<string> {
  if (usingEmulators()) return "owner";
  const hit = cached.get(scope);
  if (hit && hit.exp > Date.now() + 60_000) return hit.token;
  const raw = serverEnv().FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new HttpError(503, "server credentials not configured");
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };
  const key = await importPKCS8(sa.private_key, "RS256");
  const assertion = await new SignJWT({ scope })
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
  cached.set(scope, { token: body.access_token, exp: Date.now() + body.expires_in * 1000 });
  return body.access_token;
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
        // مع الزيادات أو الدمج: نحدّث الحقول المذكورة فقط ونترك الباقي
        ...(w.merge || w.increments ? { updateMask: { fieldPaths: Object.keys(w.data) } } : {}),
        ...(w.increments
          ? { updateTransforms: Object.entries(w.increments).map(([fieldPath, n]) => ({ fieldPath, increment: encode(n) })) }
          : {}),
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

/** يحذف وثيقة وكل ما تحتها (كل المجموعات الفرعية بأي عمق) على دفعات من 500.
 *  استعلام «بلا نوع» على الأبناء كما يفعل recursiveDelete في SDK الخادم. يُرجع عدد المحذوف. */
export async function adminDeleteTree(path: string): Promise<number> {
  const parent = `${docsRoot()}/${path}`;
  let total = 0;
  for (let round = 0; round < 40; round++) {
    const res = await fetch(`${apiBase()}/${parent}:runQuery`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery: { from: [{ allDescendants: true }], select: { fields: [{ fieldPath: "__name__" }] }, limit: 500 } }),
    });
    if (!res.ok) throw new Error(`firestore query ${res.status}`);
    const names = ((await res.json()) as { document?: { name: string } }[]).flatMap((r) => (r.document ? [r.document.name] : []));
    if (!names.length) break;
    await deleteNames(names);
    total += names.length;
    if (names.length < 500) break;
  }
  await deleteNames([parent]);
  return total;
}

/** حذف وثائق بمساراتها النسبية (لا يفشل إن لم تكن موجودة). */
export async function adminDelete(paths: string[]) {
  await deleteNames(paths.map((p) => `${docsRoot()}/${p}`));
}

async function deleteNames(names: string[]) {
  if (!names.length) return;
  const res = await fetch(`${apiBase()}/${docsRoot()}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes: names.map((name) => ({ delete: name })) }),
  });
  if (!res.ok) throw new Error(`firestore delete ${res.status}`);
}

/** معرّفات وثائق مجموعة تحقق حقلًا منطقيًا = true (مثل staff حيث admin). */
export async function adminIdsWhere(collection: string, field: string): Promise<string[]> {
  const res = await fetch(`${apiBase()}/${docsRoot()}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { booleanValue: true } } },
        select: { fields: [{ fieldPath: "__name__" }] },
        limit: 20,
      },
    }),
  });
  if (!res.ok) return [];
  return ((await res.json()) as { document?: { name: string } }[]).flatMap((r) => (r.document ? [r.document.name.split("/").pop()!] : []));
}

/** كل وثائق مجموعة صغيرة (حتى 100) مع حقولها. */
export async function adminList(collection: string): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const res = await fetch(`${apiBase()}/${docsRoot()}/${collection}?pageSize=100`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { documents?: { name: string; fields?: Record<string, Value> }[] };
  return (body.documents ?? []).map((d) => ({ id: d.name.split("/").pop()!, data: decodeFields(d.fields ?? {}) }));
}
