/**
 * منح/سحب دور (Custom Claim) لمستخدم بالبريد الإلكتروني.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     node scripts/set-role.mjs you@example.com admin
 *   node scripts/set-role.mjs you@example.com admin --remove
 *
 * الأدوار: admin | contentEditor | finance
 * ملف Service Account من: Firebase Console → Project settings → Service accounts
 * → Generate new private key. لا ترفعه إلى المستودع (مُستثنى في .gitignore).
 * يسري الدور بعد تحديث رمز المستخدم (خروج/دخول، أو خلال ساعة على الأكثر).
 */
import { readFileSync } from "node:fs";
import { SignJWT, importPKCS8 } from "jose";

const ROLES = ["admin", "contentEditor", "finance"];
const [email, role, flag] = process.argv.slice(2);

if (!email || !ROLES.includes(role)) {
  console.error("Usage: node scripts/set-role.mjs <email> <admin|contentEditor|finance> [--remove]");
  process.exit(1);
}

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to the service account JSON path.");
  process.exit(1);
}
const sa = JSON.parse(readFileSync(keyPath, "utf8"));

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform",
  })
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
  return data.access_token;
}

const token = await accessToken();
const api = `https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}`;
const call = async (path, body) => {
  const res = await fetch(`${api}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path}: ${JSON.stringify(data)}`);
  return data;
};

const { users } = await call("accounts:lookup", { email: [email] });
const user = users?.[0];
if (!user) {
  console.error(`No user with email ${email}. Sign up in the app first.`);
  process.exit(1);
}

const claims = user.customAttributes ? JSON.parse(user.customAttributes) : {};
if (flag === "--remove") delete claims[role];
else claims[role] = true;

await call("accounts:update", { localId: user.localId, customAttributes: JSON.stringify(claims) });
console.log(`✓ ${email} (${user.localId}) claims:`, claims);
