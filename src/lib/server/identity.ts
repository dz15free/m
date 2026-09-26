import "server-only";
import { usingEmulators } from "./auth";
import { accessToken } from "./firestore-admin";

/* إدارة أدوار الحسابات (Custom claims) عبر Identity Toolkit بحساب الخدمة. */

const SCOPE = "https://www.googleapis.com/auth/identitytoolkit";
const base = () =>
  usingEmulators()
    ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"}/identitytoolkit.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`
    : `https://identitytoolkit.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`;

export type Roles = { admin: boolean; contentEditor: boolean; finance: boolean };

export async function getAccount(uid: string): Promise<{ email: string; roles: Roles; disabled: boolean; lastLoginAt: number | null } | null> {
  const res = await fetch(`${base()}/accounts:lookup`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(SCOPE)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ localId: [uid] }),
  });
  if (!res.ok) throw new Error(`lookup ${res.status}`);
  const user = ((await res.json()) as { users?: { email?: string; customAttributes?: string; disabled?: boolean; lastLoginAt?: string }[] }).users?.[0];
  if (!user) return null;
  const claims = user.customAttributes ? (JSON.parse(user.customAttributes) as Record<string, unknown>) : {};
  return {
    email: user.email ?? "",
    roles: { admin: claims.admin === true, contentEditor: claims.contentEditor === true, finance: claims.finance === true },
    disabled: !!user.disabled,
    lastLoginAt: user.lastLoginAt ? Number(user.lastLoginAt) : null,
  };
}

export async function setRoles(uid: string, roles: Roles) {
  const claims = Object.fromEntries(Object.entries(roles).filter(([, v]) => v));
  const res = await fetch(`${base()}/accounts:update`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(SCOPE)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify(claims) }),
  });
  if (!res.ok) throw new Error(`update ${res.status}`);
}

/** حذف حساب الدخول نهائيًا. */
export async function deleteAccount(uid: string) {
  const res = await fetch(`${base()}/accounts:delete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(SCOPE)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ localId: uid }),
  });
  if (!res.ok && res.status !== 404) throw new Error(`delete ${res.status}`);
}
