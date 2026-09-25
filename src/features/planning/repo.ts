"use client";

import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import { MAX_ROWS, progressionId, ROW_MAX, type Progression } from "./logic";

const col = (uid: string) => collection(getFirebase().db, "teachers", uid, "progressions");

export async function listProgressions(uid: string): Promise<Progression[]> {
  const snap = await getDocs(col(uid));
  return snap.docs.map((d) => d.data() as Progression);
}

export async function getProgression(uid: string, classId: string, subjectId: string): Promise<Progression | null> {
  const snap = await getDoc(doc(col(uid), progressionId(classId, subjectId)));
  return snap.exists() ? (snap.data() as Progression) : null;
}

export async function saveProgression(uid: string, p: Progression) {
  const rows = p.rows
    .map((r) => ({
      w: Math.min(40, Math.max(1, Math.round(r.w) || 1)),
      unit: r.unit.replace(/\s+/g, " ").trim().slice(0, ROW_MAX.unit),
      content: r.content.replace(/\s+/g, " ").trim().slice(0, ROW_MAX.content),
      done: !!r.done,
    }))
    .filter((r) => r.unit || r.content)
    .sort((a, b) => a.w - b.w)
    .slice(0, MAX_ROWS);
  await setDoc(doc(col(uid), progressionId(p.classId, p.subjectId)), {
    classId: p.classId,
    subjectId: p.subjectId,
    startDate: p.startDate,
    rows,
    updatedAt: serverTimestamp(),
  });
  return rows;
}
