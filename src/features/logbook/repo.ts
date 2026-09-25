"use client";

import {
  addDoc,
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
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import {
  cleanLesson,
  cleanPrep,
  isBlank,
  lessonKey,
  normalizeTraining,
  TRAINING_MAX,
  type LessonEntry,
  type PrepEntry,
  type TrainingEntry,
} from "./logic";

const db = () => getFirebase().db;
const lessonsCol = (uid: string) => collection(db(), "teachers", uid, "lessons");
const trainingsCol = (uid: string) => collection(db(), "teachers", uid, "trainings");
const prepsCol = (uid: string) => collection(db(), "teachers", uid, "preps");

/** أسطر الدفتر لعدة أيام (أسبوع = استعلام واحد). */
export async function listLessons(uid: string, dates: string[]): Promise<Map<string, LessonEntry>> {
  const out = new Map<string, LessonEntry>();
  for (let i = 0; i < dates.length; i += 10) {
    const snap = await getDocs(query(lessonsCol(uid), where("date", "in", dates.slice(i, i + 10))));
    snap.docs.forEach((d) => out.set(d.id, { ...(d.data() as LessonEntry), activity: (d.data() as Partial<LessonEntry>).activity ?? "" }));
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
  return snap.docs.map((d) => ({ id: d.id, ...normalizeTraining(d.data()) }));
}

const cleanTraining = (e: TrainingEntry): TrainingEntry => {
  const line = (v: string, max: number) => v.replace(/\s+/g, " ").trim().slice(0, max);
  const seminar = e.kind === "seminar";
  return {
    date: e.date,
    kind: e.kind,
    topic: line(e.topic, TRAINING_MAX.topic),
    place: line(e.place, TRAINING_MAX.place),
    // حقول الندوة لا معنى لها في غيرها
    lesson: seminar ? line(e.lesson, TRAINING_MAX.lesson) : "",
    practitioner: seminar ? line(e.practitioner, TRAINING_MAX.practitioner) : "",
    level: seminar ? line(e.level, TRAINING_MAX.level) : "",
    supervisor: line(e.supervisor, TRAINING_MAX.supervisor),
    domain: e.domain,
    notes: e.notes.trim().slice(0, TRAINING_MAX.notes),
  };
};

export async function addTraining(uid: string, e: TrainingEntry) {
  await addDoc(trainingsCol(uid), { ...cleanTraining(e), updatedAt: serverTimestamp() });
}

export async function updateTraining(uid: string, id: string, e: TrainingEntry) {
  await updateDoc(doc(trainingsCol(uid), id), { ...cleanTraining(e), updatedAt: serverTimestamp() });
}

export async function removeTraining(uid: string, id: string) {
  await deleteDoc(doc(trainingsCol(uid), id));
}

// ── المذكرات ──

export type PrepDoc = PrepEntry & { id: string };

export async function listPreps(uid: string): Promise<PrepDoc[]> {
  const snap = await getDocs(query(prepsCol(uid), orderBy("updatedAt", "desc"), limit(500)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as PrepEntry) }));
}

export async function getPrep(uid: string, id: string): Promise<PrepDoc | null> {
  const snap = await getDoc(doc(prepsCol(uid), id));
  return snap.exists() ? { id: snap.id, ...(snap.data() as PrepEntry) } : null;
}

/** يُرجع معرّف المذكرة (الجديدة أو المعدّلة). */
export async function savePrep(uid: string, p: PrepEntry, id?: string): Promise<string> {
  const data = { ...cleanPrep(p), updatedAt: serverTimestamp() };
  if (id) {
    await setDoc(doc(prepsCol(uid), id), data);
    return id;
  }
  return (await addDoc(prepsCol(uid), data)).id;
}

export async function removePrep(uid: string, id: string) {
  await deleteDoc(doc(prepsCol(uid), id));
}
