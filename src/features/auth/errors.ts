/* تحويل رموز أخطاء Firebase Auth إلى مفتاح رسالة مفهومة (auth.errors.*).
   لا يُعرض رمز تقني للأستاذ أبدًا. */
export type AuthErrorKey =
  | "invalidCredentials"
  | "emailInUse"
  | "weakPassword"
  | "invalidEmail"
  | "tooManyRequests"
  | "network"
  | "popupClosed"
  | "accountExists"
  | "unauthorizedDomain"
  | "notConfigured"
  | "generic";

const MAP: Record<string, AuthErrorKey> = {
  "auth/invalid-credential": "invalidCredentials",
  "auth/invalid-login-credentials": "invalidCredentials",
  "auth/wrong-password": "invalidCredentials",
  "auth/user-not-found": "invalidCredentials",
  "auth/email-already-in-use": "emailInUse",
  "auth/weak-password": "weakPassword",
  "auth/password-does-not-meet-requirements": "weakPassword",
  "auth/invalid-email": "invalidEmail",
  "auth/too-many-requests": "tooManyRequests",
  "auth/network-request-failed": "network",
  "auth/popup-closed-by-user": "popupClosed",
  "auth/cancelled-popup-request": "popupClosed",
  "auth/user-cancelled": "popupClosed",
  "auth/account-exists-with-different-credential": "accountExists",
  "auth/unauthorized-domain": "unauthorizedDomain",
  "auth/invalid-api-key": "notConfigured",
  "auth/configuration-not-found": "notConfigured",
  "auth/operation-not-allowed": "notConfigured",
};

export function authErrorKey(error: unknown): AuthErrorKey {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (!code && error instanceof Error && error.message.includes("not configured")) return "notConfigured";
  if (code && !MAP[code] && process.env.NODE_ENV !== "production") {
    console.warn("[auth] unmapped error code:", code);
  }
  return MAP[code] ?? "generic";
}
