"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { authedFetch } from "@/lib/firebase/api";
import { getFirebase } from "@/lib/firebase/client";

/* الإشعارات: عامة من الإدارة `announcements` + شخصية من الخادم `teachers/{uid}/notifications`.
   عند فتح التطبيق نقرأ تاريخين فقط (آخر إعلان في config/app وآخر شخصي في prefs)؛
   القائمة لا تُجلب إلا عند فتح الجرس. */

export type Kind = "news" | "update" | "content" | "offer" | "billing";
export type Notice = { id: string; kind: Kind; title: { ar: string; fr: string }; body: { ar: string; fr: string }; link: string; createdAt: number; personal: boolean };

const db = () => getFirebase().db;
const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : typeof v === "number" ? v : 0);
const prefsRef = (uid: string) => doc(db(), "teachers", uid, "prefs", "notifications");

export async function getNotificationState(uid: string): Promise<{ readAt: number; personalLatestAt: number; latestAnnouncementAt: number }> {
  const [prefs, app] = await Promise.all([getDoc(prefsRef(uid)).catch(() => null), getDoc(doc(db(), "config", "app")).catch(() => null)]);
  return {
    readAt: ms(prefs?.data()?.readAt),
    personalLatestAt: ms(prefs?.data()?.personalLatestAt),
    latestAnnouncementAt: ms(app?.data()?.latestAnnouncementAt),
  };
}

export async function listNotices(uid: string): Promise<Notice[]> {
  const [pub, mine] = await Promise.all([
    getDocs(query(collection(db(), "announcements"), orderBy("createdAt", "desc"), limit(20))),
    getDocs(query(collection(db(), "teachers", uid, "notifications"), orderBy("createdAt", "desc"), limit(20))).catch(() => null),
  ]);
  const map = (personal: boolean) => (d: { id: string; data: () => Record<string, unknown> }) => {
    const x = d.data();
    return { id: d.id, ...(x as Omit<Notice, "id" | "createdAt" | "personal">), createdAt: ms(x.createdAt), personal } as Notice;
  };
  return [...pub.docs.map(map(false)), ...(mine?.docs.map(map(true)) ?? [])].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
}

export async function markAllRead(uid: string) {
  const ref = prefsRef(uid);
  const snap = await getDoc(ref).catch(() => null);
  if (snap?.exists()) await updateDoc(ref, { readAt: serverTimestamp() });
  else await setDoc(ref, { readAt: serverTimestamp() });
}

// ── النشر (الأدمن، أو المحرّر لإشعار محتوى) ──

/** يمرّ عبر الخادم: يكتب الإعلان ويرسله إلى الهواتف المشتركة. */
export async function publishAnnouncement(a: Omit<Notice, "id" | "createdAt" | "personal">) {
  const res = await authedFetch("/api/admin/announce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: a.title, body: a.body, link: a.link, kind: a.kind }),
  });
  if (!res.ok) throw new Error(`announce ${res.status}`);
}

export async function listAnnouncements(): Promise<Notice[]> {
  const snap = await getDocs(query(collection(db(), "announcements"), orderBy("createdAt", "desc"), limit(50)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Notice, "id">), createdAt: ms(d.data().createdAt), personal: false }));
}

export async function deleteAnnouncement(id: string) {
  await deleteDoc(doc(db(), "announcements", id));
}
