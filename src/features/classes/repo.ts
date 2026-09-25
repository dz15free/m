"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type WriteBatch,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import type { Stage } from "@/shared/dz/education";
import { classDisplayName } from "./naming";

/* الأقسام والإسنادات. الإسناد = (قسم × مادة): الوحدة التي سيُبنى عليها
   جدول التوقيت والدفتر والتوزيع والعلامات. معرّفه ثابت `{classId}__{subjectId}`
   فلا يتكرر الإسناد نفسه أبدًا. */

export type ClassDoc = {
  id: string;
  yearId: string;
  schoolId: string;
  stage: Stage;
  level: string;
  section: string;
  displayName: string;
  subjectIds: string[];
  studentCount: number;
  archived: boolean;
  copiedFrom: string | null;
};

export type ClassContext = { yearId: string; schoolId: string; stage: Stage };
export type ClassDraft = { level: string; section: string; subjectIds: string[]; copiedFrom?: string };

const db = () => getFirebase().db;
const classesCol = (uid: string) => collection(db(), "teachers", uid, "classes");
const assignmentRef = (uid: string, classId: string, subjectId: string) =>
  doc(db(), "teachers", uid, "assignments", `${classId}__${subjectId}`);

/** دفعات Firestore محدودة بـ 500 عملية؛ نقسّم بهامش أمان. */
async function commitInChunks(ops: ((b: WriteBatch) => void)[]) {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db());
    ops.slice(i, i + 450).forEach((op) => op(batch));
    await batch.commit();
  }
}

export async function listClasses(uid: string, yearId: string): Promise<ClassDoc[]> {
  const snap = await getDocs(query(classesCol(uid), where("yearId", "==", yearId), where("archived", "==", false)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClassDoc, "id">) }));
}

export async function getClass(uid: string, classId: string): Promise<ClassDoc | null> {
  const snap = await getDoc(doc(classesCol(uid), classId));
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<ClassDoc, "id">) } : null;
}

/** إنشاء عدة أقسام مع إسناداتها دفعة واحدة. يعيد المعرّفات الجديدة. */
export async function createClasses(uid: string, ctx: ClassContext, drafts: ClassDraft[]): Promise<string[]> {
  const now = serverTimestamp();
  const ids: string[] = [];
  const ops: ((b: WriteBatch) => void)[] = [];

  for (const d of drafts) {
    const ref = doc(classesCol(uid));
    ids.push(ref.id);
    ops.push((b) =>
      b.set(ref, {
        yearId: ctx.yearId,
        schoolId: ctx.schoolId,
        stage: ctx.stage,
        level: d.level,
        section: d.section,
        displayName: classDisplayName(d.level, d.section),
        subjectIds: d.subjectIds,
        roster: [],
        studentCount: 0,
        archived: false,
        copiedFrom: d.copiedFrom ?? null,
        createdAt: now,
        updatedAt: now,
      }),
    );
    for (const subjectId of d.subjectIds) {
      ops.push((b) => b.set(assignmentRef(uid, ref.id, subjectId), assignmentData(ctx, ref.id, d.level, subjectId)));
    }
  }

  await commitInChunks(ops);
  return ids;
}

function assignmentData(ctx: ClassContext, classId: string, level: string, subjectId: string) {
  const now = serverTimestamp();
  return { ...ctx, classId, level, subjectId, createdAt: now, updatedAt: now };
}

/** تعديل مواد القسم: يُنشئ إسنادات المواد المضافة ويحذف إسنادات المحذوفة. */
export async function updateClassSubjects(uid: string, cls: ClassDoc, subjectIds: string[]) {
  const added = subjectIds.filter((s) => !cls.subjectIds.includes(s));
  const removed = cls.subjectIds.filter((s) => !subjectIds.includes(s));
  const ctx = { yearId: cls.yearId, schoolId: cls.schoolId, stage: cls.stage };
  const batch = writeBatch(db());
  batch.update(doc(classesCol(uid), cls.id), { subjectIds, updatedAt: serverTimestamp() });
  added.forEach((s) => batch.set(assignmentRef(uid, cls.id, s), assignmentData(ctx, cls.id, cls.level, s)));
  removed.forEach((s) => batch.delete(assignmentRef(uid, cls.id, s)));
  await batch.commit();
}

export async function renameClass(uid: string, classId: string, displayName: string) {
  const batch = writeBatch(db());
  batch.update(doc(classesCol(uid), classId), { displayName: displayName.trim(), updatedAt: serverTimestamp() });
  await batch.commit();
}

/** الأرشفة تُبقي كل شيء (للسنوات السابقة والإحصائيات) وتخفي القسم من القوائم. */
export async function archiveClass(uid: string, classId: string) {
  const batch = writeBatch(db());
  batch.update(doc(classesCol(uid), classId), { archived: true, updatedAt: serverTimestamp() });
  await batch.commit();
}

/** الحذف النهائي متاح فقط لقسم بلا تلاميذ (القواعد تفرض ذلك أيضًا). */
export async function deleteClass(uid: string, cls: ClassDoc) {
  const batch = writeBatch(db());
  cls.subjectIds.forEach((s) => batch.delete(assignmentRef(uid, cls.id, s)));
  batch.delete(doc(classesCol(uid), cls.id));
  await batch.commit();
}
