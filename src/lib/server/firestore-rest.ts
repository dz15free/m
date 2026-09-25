import "server-only";
import { usingEmulators } from "./auth";

/* قراءة Firestore من الخادم عبر REST **برمز المستخدم نفسه**: قواعد الأمان تُطبَّق
   كما في المتصفح تمامًا، فلا نحتاج حساب خدمة (service account) ولا صلاحيات إضافية. */

type Value = Record<string, unknown>;

function base(): string {
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const host = usingEmulators() ? `http://${process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"}` : "https://firestore.googleapis.com";
  return `${host}/v1/projects/${project}/databases/(default)/documents`;
}

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

function decodeFields(fields: Record<string, Value>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));
}

/** المستند كما يراه صاحب الرمز، أو null إن لم يوجد أو لم يُسمح له بقراءته. */
export async function getDocAs(path: string, idToken: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${base()}/${path.split("/").map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`firestore ${res.status}`);
  const body = (await res.json()) as { fields?: Record<string, Value> };
  return decodeFields(body.fields ?? {});
}
