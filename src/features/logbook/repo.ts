"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import { cleanCard, type TeacherCard } from "./front-logic";
import { cleanSheet, gradesDocId, type MarksSheet, type Term } from "./grades-logic";
import {
  cleanLesson,
  cleanPrep,
  isBlank,
  lessonKey,
  type LessonEntry,
  type PrepEntry,
} from "./logic";

const db = () => getFirebase().db;
const lessonsCol = (uid: string) => collection(db(), "teachers", uid, "lessons");
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

// ── بطاقة الحالة الشخصية والمهنية (خاصة بالأستاذ وحده) ──

const cardRef = (uid: string) => doc(db(), "teachers", uid, "private", "card");

export async function getCard(uid: string): Promise<TeacherCard> {
  const snap = await getDoc(cardRef(uid));
  return cleanCard(snap.exists() ? (snap.data() as Partial<TeacherCard>) : {});
}

export async function saveCard(uid: string, card: TeacherCard) {
  await setDoc(cardRef(uid), { ...cleanCard(card), updatedAt: serverTimestamp() });
}

// ── دفتر التنقيط ──

const gradesRef = (uid: string, classId: string, term: Term) => doc(db(), "teachers", uid, "grades", gradesDocId(classId, term));

export async function getGrades(uid: string, classId: string, term: Term, scale: number): Promise<MarksSheet> {
  const snap = await getDoc(gradesRef(uid, classId, term));
  return cleanSheet(snap.exists() ? snap.data().marks : null, scale);
}

/** علامة واحدة (null = مسح). الدمج يحفظ بقية الكشف كما هو. */
export async function setMark(uid: string, classId: string, term: Term, studentId: string, column: string, value: number | null) {
  await setDoc(
    gradesRef(uid, classId, term),
    { classId, term, marks: { [studentId]: { [column]: value === null ? deleteField() : value } }, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
