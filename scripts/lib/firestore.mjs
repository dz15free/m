/* أداة مشتركة لسكربتات الإدارة: كتابة وثائق Firestore عبر REST
   بحساب خدمة (GOOGLE_APPLICATION_CREDENTIALS) أو على المحاكي (FIRESTORE_EMULATOR_HOST). */
import { readFileSync } from "node:fs";
import { SignJWT, importPKCS8 } from "jose";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;

let projectId = "prof-baczone";
let authHeader = "Bearer owner"; // المحاكي يقبل هذا الرمز كصلاحية كاملة

if (!emulator) {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    console.error("Set GOOGLE_APPLICATION_CREDENTIALS (or FIRESTORE_EMULATOR_HOST).");
    process.exit(1);
  }
  const sa = JSON.parse(readFileSync(keyPath, "utf8"));
  projectId = sa.project_id;
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/datastore" })
    .setProtectedHeader({ alg: "RS256", kid: sa.private_key_id })
    .setIssuer(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await importPKCS8(sa.private_key, "RS256"));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`token: ${JSON.stringify(data)}`);
  authHeader = `Bearer ${data.access_token}`;
}

/** تحويل قيمة JS إلى صيغة Firestore REST. */
function toValue(v) {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === "object") return { mapValue: { fields: toFields(v) } };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  return { stringValue: String(v) };
}
const toFields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]));

export const base = emulator
  ? `http://${emulator}/v1/projects/${projectId}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;


export async function putDoc(path, data) {
  const res = await fetch(`${base}/${path}`, {
    method: "PATCH",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
}
