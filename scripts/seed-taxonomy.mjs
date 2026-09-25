/**
 * رفع المستويات والمواد الافتراضية إلى `taxonomy/{stage}` في Firestore.
 * بعدها يعدّلها الأدمن من القاعدة (ولوحة الإدارة لاحقًا) دون نشر جديد.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-taxonomy.mjs
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/seed-taxonomy.mjs   # على المحاكي
 *
 * يستبدل الوثائق الثلاث (primary, middle, secondary) بمحتوى
 * src/shared/taxonomy/defaults.json.
 */
import { readFileSync } from "node:fs";
import { SignJWT, importPKCS8 } from "jose";

const taxonomy = JSON.parse(readFileSync("src/shared/taxonomy/defaults.json", "utf8"));
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

const base = emulator
  ? `http://${emulator}/v1/projects/${projectId}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

for (const [stage, data] of Object.entries(taxonomy)) {
  const res = await fetch(`${base}/taxonomy/${stage}`, {
    method: "PATCH",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) throw new Error(`${stage}: ${res.status} ${await res.text()}`);
  console.log(`✓ taxonomy/${stage}: ${data.levels.length} levels, ${data.subjects.length} subjects`);
}
