"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import { cleanLesson, isBlank, lessonKey, type LessonEntry, type TrainingEntry } from "./logic";

const db = () => getFirebase().db;
const lessonsCol = (uid: string) => collection(db(), "teachers", uid, "lessons");
const trainingsCol = (uid: string) => collection(db(), "teachers", uid, "trainings");

/** أسطر الدفتر لعدة أيام (أسبوع = استعلام واحد). */
export async function listLessons(uid: string, dates: string[]): Promise<Map<string, LessonEntry>> {
  const out = new Map<string, LessonEntry>();
  for (let i = 0; i < dates.length; i += 10) {
    const snap = await getDocs(query(lessonsCol(uid), where("date", "in", dates.slice(i, i + 10))));
    snap.docs.forEach((d) => out.set(d.id, d.data() as LessonEntry));
  }
  return out;
}

/** حفظ سطر؛ السطر الذي أُفرغ تمامًا يُحذف (لا نخزّن أسطرًا فارغة). */
export async function saveLesson(uid: string, entry: LessonEntry): Promise<void> {
  const clean = cleanLesson(entry);
  const ref = doc(lessonsCol(uid), lessonKey(clean.date, clean.classId, clean.subjectId, clean.start));
  if (isBlank(clean)) {
    await deleteDoc(ref);
    return;
  }
  await setDoc(ref, { ...clean, updatedAt: serverTimestamp() });
}

export type TrainingDoc = TrainingEntry & { id: string };

export async function listTrainings(uid: string): Promise<TrainingDoc[]> {
  const snap = await getDocs(query(trainingsCol(uid), orderBy("date", "desc"), limit(200)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as TrainingEntry) }));
}

const cleanTraining = (e: TrainingEntry): TrainingEntry => ({
  date: e.date,
  kind: e.kind,
  topic: e.topic.trim().slice(0, 200),
  supervisor: e.supervisor.trim().slice(0, 120),
  place: e.place.trim().slice(0, 120),
  notes: e.notes.trim().slice(0, 1000),
});

export async function addTraining(uid: string, e: TrainingEntry) {
  await addDoc(trainingsCol(uid), { ...cleanTraining(e), updatedAt: serverTimestamp() });
}

export async function updateTraining(uid: string, id: string, e: TrainingEntry) {
  await updateDoc(doc(trainingsCol(uid), id), { ...cleanTraining(e), updatedAt: serverTimestamp() });
}

export async function removeTraining(uid: string, id: string) {
  await deleteDoc(doc(trainingsCol(uid), id));
}
