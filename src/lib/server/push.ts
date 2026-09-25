import "server-only";
import { usingEmulators } from "./auth";
import { accessToken, adminCommit, adminGet } from "./firestore-admin";

/* إشعارات الهاتف عبر Firebase Cloud Messaging (Web Push) — مجانية.
   - كل جهاز يُشترك في موضوع حسب لغته (all_ar / all_fr) فتُرسَل الإعلانات بطلب واحد.
   - الإشعارات الشخصية تُرسل لأجهزة الأستاذ المسجّلة في teachers/{uid}/pushTokens.
   على المحاكي لا يُرسل شيء (تسجيل فقط). */

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const project = () => process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

export type PushMessage = { title: string; body: string; link: string; tag?: string };

function payload(target: { token: string } | { topic: string }, m: PushMessage) {
  return {
    message: {
      ...target,
      // يعرضه عامل الخدمة الخاص بنا (sw.js) من حقل data
      data: { title: m.title.slice(0, 120), body: m.body.slice(0, 240), link: m.link, tag: m.tag ?? "" },
      webpush: { headers: { Urgency: "normal", TTL: String(3 * 86400) } },
    },
  };
}

async function send(target: { token: string } | { topic: string }, m: PushMessage): Promise<"ok" | "gone" | "error"> {
  if (usingEmulators()) {
    console.log("[push:dev]", JSON.stringify(target).slice(0, 60), m.title);
    return "ok";
  }
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${project()}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(SCOPE)}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload(target, m)),
  });
  if (res.ok) return "ok";
  const text = await res.text();
  if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(text)) return "gone";
  console.error("[push] send failed", res.status, text.slice(0, 200));
  return "error";
}

export const topicFor = (locale: string) => (locale === "fr" ? "all_fr" : "all_ar");

export async function sendToTopic(topic: string, m: PushMessage) {
  return send({ topic }, m).catch(() => "error" as const);
}

/** إشعار لكل أجهزة أستاذ (بلغته)؛ الرموز المنتهية تُحذف. لا يرمي أبدًا. */
export async function sendToUser(uid: string, m: { ar: PushMessage; fr: PushMessage }) {
  try {
    const user = await adminGet(`users/${uid}`);
    const msg = user?.data.locale === "fr" ? m.fr : m.ar;
    const list = await listTokens(uid);
    const results = await Promise.all(list.map(async (t) => [t.id, await send({ token: t.token }, msg)] as const));
    const gone = results.filter(([, r]) => r === "gone").map(([id]) => id);
    if (gone.length) await deleteDocs(gone.map((id) => `teachers/${uid}/pushTokens/${id}`));
  } catch (e) {
    console.error("[push] user", e);
  }
}

/** اشتراك رمز جهاز في موضوع (Instance ID API) — مرة عند التسجيل. */
export async function subscribeToTopic(token: string, topic: string) {
  if (usingEmulators()) return;
  const res = await fetch("https://iid.googleapis.com/iid/v1:batchAdd", {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(SCOPE)}`, "Content-Type": "application/json", access_token_auth: "true" },
    body: JSON.stringify({ to: `/topics/${topic}`, registration_tokens: [token] }),
  });
  if (!res.ok) console.error("[push] topic subscribe failed", res.status, (await res.text()).slice(0, 200));
}

// ── مساعدات REST ──

async function listTokens(uid: string): Promise<{ id: string; token: string }[]> {
  const host = usingEmulators() ? `http://${process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"}` : "https://firestore.googleapis.com";
  const res = await fetch(`${host}/v1/projects/${project()}/databases/(default)/documents/teachers/${uid}/pushTokens?pageSize=20`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { documents?: { name: string; fields?: { token?: { stringValue?: string } } }[] };
  return (body.documents ?? [])
    .map((d) => ({ id: d.name.split("/").pop()!, token: d.fields?.token?.stringValue ?? "" }))
    .filter((t) => t.token);
}

async function deleteDocs(paths: string[]) {
  const host = usingEmulators() ? `http://${process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"}` : "https://firestore.googleapis.com";
  const root = `projects/${project()}/databases/(default)/documents`;
  await fetch(`${host}/v1/${root}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes: paths.map((p) => ({ delete: `${root}/${p}` })) }),
  });
}

export async function saveToken(uid: string, token: string, locale: string, ua: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  const id = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  await adminCommit([{ path: `teachers/${uid}/pushTokens/${id}`, data: { token, locale, ua: ua.slice(0, 200), createdAt: new Date() } }]);
}
