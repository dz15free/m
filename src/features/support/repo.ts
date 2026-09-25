"use client";

import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";

/* التواصل مع الإدارة: محادثة لكل أستاذ `supportThreads/{uid}` ورسائلها.
   الاستماع الحيّ (onSnapshot) فقط أثناء فتح المحادثة، وعلى ملخصها لإظهار شارة «جديد». */

export type Thread = {
  uid: string;
  name: string;
  email: string;
  lastMessage: string;
  lastMessageAt: number;
  lastFrom: "teacher" | "admin";
  unreadAdmin: boolean;
  unreadTeacher: boolean;
  status: "open" | "closed";
};
export type Message = { id: string; from: "teacher" | "admin"; text: string; at: number };

const db = () => getFirebase().db;
const threadRef = (uid: string) => doc(db(), "supportThreads", uid);
const messagesCol = (uid: string) => collection(db(), "supportThreads", uid, "messages");
const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : Date.now());

export function watchThread(uid: string, cb: (t: Thread | null) => void) {
  return onSnapshot(
    threadRef(uid),
    (s) => cb(s.exists() ? ({ ...(s.data() as Thread), lastMessageAt: ms(s.data().lastMessageAt) }) : null),
    () => cb(null),
  );
}

export function watchMessages(uid: string, cb: (m: Message[]) => void) {
  return onSnapshot(
    query(messagesCol(uid), orderBy("at", "desc"), limit(100)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, "id">), at: ms(d.data().at) })).reverse()),
    () => cb([]),
  );
}

export async function sendTeacherMessage(uid: string, who: { name: string; email: string }, text: string) {
  const clean = text.trim().slice(0, 2000);
  if (!clean) return;
  const batch = writeBatch(db());
  batch.set(doc(messagesCol(uid)), { from: "teacher", text: clean, at: serverTimestamp() });
  batch.set(threadRef(uid), {
    uid,
    name: who.name.slice(0, 130),
    email: who.email.slice(0, 200),
    lastMessage: clean.slice(0, 140),
    lastMessageAt: serverTimestamp(),
    lastFrom: "teacher",
    unreadAdmin: true,
    unreadTeacher: false,
    status: "open",
  });
  await batch.commit();
}

export async function markReadByTeacher(uid: string) {
  await updateDoc(threadRef(uid), { unreadTeacher: false }).catch(() => {});
}

// ── الإدارة ──

export function watchThreads(cb: (t: Thread[]) => void) {
  return onSnapshot(
    query(collection(db(), "supportThreads"), orderBy("lastMessageAt", "desc"), limit(100)),
    (s) => cb(s.docs.map((d) => ({ ...(d.data() as Thread), lastMessageAt: ms(d.data().lastMessageAt) }))),
    () => cb([]),
  );
}

export async function sendAdminMessage(uid: string, text: string) {
  const clean = text.trim().slice(0, 2000);
  if (!clean) return;
  const batch = writeBatch(db());
  batch.set(doc(messagesCol(uid)), { from: "admin", text: clean, at: serverTimestamp() });
  batch.update(threadRef(uid), {
    lastMessage: clean.slice(0, 140),
    lastMessageAt: serverTimestamp(),
    lastFrom: "admin",
    unreadAdmin: false,
    unreadTeacher: true,
  });
  await batch.commit();
}

export async function markReadByAdmin(uid: string) {
  await updateDoc(threadRef(uid), { unreadAdmin: false }).catch(() => {});
}

export async function setThreadStatus(uid: string, status: "open" | "closed") {
  await updateDoc(threadRef(uid), { status });
}

// للاستعمال من أماكن أخرى (مثل «الاشتراك عبر الإدارة»): فتح المحادثة بنص مقترح
export const OPEN_SUPPORT = "open-support";
export function openSupport(text = "") {
  window.dispatchEvent(new CustomEvent(OPEN_SUPPORT, { detail: { text } }));
}

