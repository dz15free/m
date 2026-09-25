"use client";

import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import type { Student } from "./roster";

/* كل تعديل على القائمة يمرّ عبر Transaction: يقرأ آخر نسخة ثم يطبّق العملية،
   فلا يمحو تعديلٌ من جهاز آخر تعديلًا متزامنًا (كتابة واحدة للقسم كله). */

const classRef = (uid: string, classId: string) => doc(getFirebase().db, "teachers", uid, "classes", classId);

export async function mutateRoster(
  uid: string,
  classId: string,
  op: (roster: Student[]) => Student[],
): Promise<Student[]> {
  return runTransaction(getFirebase().db, async (tx) => {
    const ref = classRef(uid, classId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("class not found");
    const roster = op((snap.data().roster ?? []) as Student[]);
    tx.update(ref, { roster, studentCount: roster.length, updatedAt: serverTimestamp() });
    return roster;
  });
}

/** نقل تلاميذ بين قسمين في عملية ذرّية واحدة. */
export async function transferStudents(
  uid: string,
  fromId: string,
  toId: string,
  op: (from: Student[], to: Student[]) => { from: Student[]; to: Student[] },
): Promise<void> {
  await runTransaction(getFirebase().db, async (tx) => {
    const fromRef = classRef(uid, fromId);
    const toRef = classRef(uid, toId);
    const [a, b] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);
    if (!a.exists() || !b.exists()) throw new Error("class not found");
    const res = op((a.data().roster ?? []) as Student[], (b.data().roster ?? []) as Student[]);
    const now = serverTimestamp();
    tx.update(fromRef, { roster: res.from, studentCount: res.from.length, updatedAt: now });
    tx.update(toRef, { roster: res.to, studentCount: res.to.length, updatedAt: now });
  });
}
