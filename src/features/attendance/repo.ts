"use client";

import { doc, getDoc, increment, serverTimestamp, writeBatch } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import { monthOf, statsDelta, type AttendanceMap, type ClassStats, type Counts } from "./logic";

/* الحصص والإحصائيات. كل حفظ = دفعة واحدة:
   - مستند الحصة (الاستثناءات فقط)
   - زيادات (increment) على مستند إحصائيات القسم — دون قراءة كل الحصص من جديد.
   الكتابات تعمل دون إنترنت (كاش Firestore الدائم) وتُزامن عند العودة. */

export type SessionDoc = {
  date: string;
  classId: string;
  part: string;
  status: "held";
  attendance: AttendanceMap;
  counts: Counts;
  rosterSize: number;
};

const db = () => getFirebase().db;
const sessionRef = (uid: string, key: string) => doc(db(), "teachers", uid, "sessions", key);
const statsRef = (uid: string, classId: string) => doc(db(), "teachers", uid, "attendanceStats", classId);

export async function getSession(uid: string, key: string): Promise<SessionDoc | null> {
  try {
    const snap = await getDoc(sessionRef(uid, key));
    return snap.exists() ? (snap.data() as SessionDoc) : null;
  } catch {
    // دون إنترنت ولا نسخة محلية: حصة جديدة
    return null;
  }
}

export async function getStats(uid: string, classId: string): Promise<ClassStats> {
  const snap = await getDoc(statsRef(uid, classId));
  const data = snap.data() as Partial<ClassStats> | undefined;
  return { sessions: data?.sessions ?? 0, s: data?.s ?? {}, m: data?.m ?? {} };
}

export function saveSession(
  uid: string,
  key: string,
  next: Omit<SessionDoc, "status">,
  prev: { map: AttendanceMap; rosterSize: number } | null,
): Promise<void> {
  const batch = writeBatch(db());
  const now = serverTimestamp();

  // mergeFields: الحقول المذكورة تُستبدل كاملة (فتختفي الاستثناءات الملغاة)، والباقي يبقى
  batch.set(
    sessionRef(uid, key),
    { ...next, status: "held", updatedAt: now, ...(prev ? {} : { createdAt: now }) },
    { mergeFields: ["date", "classId", "part", "status", "attendance", "counts", "rosterSize", "updatedAt", ...(prev ? [] : ["createdAt"])] },
  );

  const delta = statsDelta(prev, { map: next.attendance, rosterSize: next.rosterSize });
  const month = monthOf(next.date);
  const inc = (n: number) => increment(n);
  const m: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(delta.month)) if (v) m[k] = inc(v);
  const s: Record<string, Record<string, unknown>> = {};
  for (const [id, d] of Object.entries(delta.students)) {
    s[id] = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, inc(v!)]));
  }
  if (Object.keys(m).length || Object.keys(s).length) {
    batch.set(
      statsRef(uid, next.classId),
      { ...(delta.month.sessions ? { sessions: inc(1) } : {}), m: { [month]: m }, s, updatedAt: now },
      { merge: true },
    );
  }
  return batch.commit();
}
