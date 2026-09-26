import "server-only";
import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTPayload } from "jose";

/* التحقق من رمز هوية Firebase على الخادم محليًا (توقيع RS256 + المُصدِر + الجمهور)
   بمفاتيح Google العامّة المُكاشة — بلا نداء شبكة لكل طلب، وبلا firebase-admin،
   فيعمل على Cloudflare Workers وVercel وNode دون تعديل. */

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
  { cacheMaxAge: 60 * 60 * 1000 },
);

export type AuthUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  /** وقت آخر تسجيل دخول فعلي (بالثواني) — لطلب دخول حديث قبل العمليات الحساسة */
  authTime: number;
  roles: { admin: boolean; contentEditor: boolean; finance: boolean };
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function projectId() {
  const id = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!id) throw new HttpError(503, "auth not configured");
  return id;
}

/** محاكي Auth المحلي يُصدر رموزًا غير موقّعة. نقبلها أثناء التطوير فقط:
    الشرطان يُقيَّمان وقت البناء، فلا يمكن تفعيل هذا في نسخة الإنتاج. */
export const usingEmulators = () =>
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true";

export async function verifyIdToken(token: string): Promise<AuthUser> {
  const project = projectId();
  let payload: JWTPayload & Record<string, unknown>;
  if (usingEmulators()) {
    try {
      payload = decodeJwt(token) as JWTPayload & Record<string, unknown>;
    } catch {
      throw new HttpError(401, "invalid token");
    }
    if (payload.aud !== project) throw new HttpError(401, "invalid token");
    return toUser(payload);
  }
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${project}`,
      audience: project,
      algorithms: ["RS256"],
    }));
  } catch {
    throw new HttpError(401, "invalid token");
  }

  const authTime = Number(payload.auth_time);
  if (!payload.sub || !Number.isFinite(authTime) || authTime * 1000 > Date.now() + 60_000) {
    throw new HttpError(401, "invalid token");
  }

  return toUser(payload);
}

function toUser(payload: JWTPayload & Record<string, unknown>): AuthUser {
  if (!payload.sub) throw new HttpError(401, "invalid token");
  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
    emailVerified: payload.email_verified === true,
    authTime: Number(payload.auth_time) || 0,
    roles: {
      admin: payload.admin === true,
      contentEditor: payload.contentEditor === true,
      finance: payload.finance === true,
    },
  };
}

/** يقرأ `Authorization: Bearer <ID token>` ويتحقق منه، وإلا يرمي 401. */
export async function requireUser(req: Request): Promise<AuthUser> {
  return verifyIdToken(bearer(req));
}

/** كالسابق مع الرمز نفسه، لقراءة Firestore بصلاحيات المستخدم. */
export async function requireUserWithToken(req: Request): Promise<AuthUser & { token: string }> {
  const token = bearer(req);
  return { ...(await verifyIdToken(token)), token };
}

function bearer(req: Request): string {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match?.[1]) throw new HttpError(401, "missing token");
  return match[1];
}

/** رد JSON موحّد للأخطاء — بلا تفاصيل تقنية للعميل. */
export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("[api] unexpected error", error);
  return Response.json({ error: "internal error" }, { status: 500 });
}
