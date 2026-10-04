/* روابط رسائل Firebase (Customize action URL ⇐ /auth/action):
   ?mode=verifyEmail|resetPassword|recoverEmail|verifyAndChangeEmail&oobCode=…&lang=… */

export type ActionMode = "verifyEmail" | "resetPassword" | "recoverEmail" | "verifyAndChangeEmail";
const MODES: readonly ActionMode[] = ["verifyEmail", "resetPassword", "recoverEmail", "verifyAndChangeEmail"];

export type ActionLink = { mode: ActionMode; oobCode: string } | null;

export function parseActionLink(params: Record<string, string | string[] | undefined>): ActionLink {
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const mode = one("mode") as ActionMode;
  const oobCode = one("oobCode");
  if (!MODES.includes(mode) || !/^[A-Za-z0-9_-]{10,400}$/.test(oobCode)) return null;
  return { mode, oobCode };
}

/** أخطاء الرابط نفسه (منتهٍ، مستعمل، معطّل) مقابل أخطاء الشبكة وكلمة المرور. */
export type ActionErrorKey = "expired" | "invalid" | "disabled" | "weakPassword" | "network" | "generic";

export function actionErrorKey(error: unknown): ActionErrorKey {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/expired-action-code":
      return "expired";
    case "auth/invalid-action-code":
    case "auth/user-not-found":
      return "invalid";
    case "auth/user-disabled":
      return "disabled";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "weakPassword";
    case "auth/network-request-failed":
      return "network";
    default:
      return "generic";
  }
}
