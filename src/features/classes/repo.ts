"use client";

import {
  arrayRemove,
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
import type { Student } from "@/features/students/roster";
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
  roster: Student[];
  studentCount: number;
  archived: boolean;
  copiedFrom: string | null;
};

export type ClassContext = { yearId: string; schoolId: string; stage: Stage };
export type ClassDraft = { level: string; section: string; subjectIds: string[]; copiedFrom?: string };

const db = () => getFirebase().db;
const classesCol = (uid: string) => collection(db(), "teachers", uid, "classes");
/** فهرس الأقسام النشطة للسنة: به تفرض القواعد حدّ الخطة (عدد الأقسام). */
const yearIndexRef = (uid: string, yearId: string) => doc(db(), "teachers", uid, "yearIndex", yearId);

export class ClassLimitError extends Error {}

/** معرّفات الأقسام النشطة في الفهرس، أو من القائمة نفسها إن لم يُنشأ الفهرس بعد (حسابات قديمة). */
async function indexedIds(uid: string, yearId: string): Promise<{ ids: string[]; exists: boolean }> {
  const snap = await getDoc(yearIndexRef(uid, yearId));
  if (snap.exists()) return { ids: (snap.data().classIds as string[]) ?? [], exists: true };
  return { ids: (await listClasses(uid, yearId)).map((c) => c.id), exists: false };
}

export async function activeClassCount(uid: string, yearId: string): Promise<number> {
  return (await indexedIds(uid, yearId)).ids.length;
}

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
  const current = await indexedIds(uid, ctx.yearId);

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

  // الفهرس في أول دفعة (القواعد تتحقق أن كل قسم جديد مُدرج فيه وأن العدد ضمن الحد)
  ops.unshift((b) => b.set(yearIndexRef(uid, ctx.yearId), { classIds: [...current.ids, ...ids], updatedAt: now }));
  try {
    await commitInChunks(ops);
  } catch (e) {
    if ((e as { code?: string }).code === "permission-denied") throw new ClassLimitError();
    throw e;
  }
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
export async function archiveClass(uid: string, classId: string, yearId: string) {
  const batch = writeBatch(db());
  batch.update(doc(classesCol(uid), classId), { archived: true, updatedAt: serverTimestamp() });
  await releaseSlot(batch, uid, yearId, classId);
  await batch.commit();
}

/** إخراج قسم من الفهرس (يحرّر مكانه ضمن حدّ الخطة). */
async function releaseSlot(batch: WriteBatch, uid: string, yearId: string, classId: string) {
  const idx = await getDoc(yearIndexRef(uid, yearId)).catch(() => null);
  if (idx?.exists()) batch.update(yearIndexRef(uid, yearId), { classIds: arrayRemove(classId), updatedAt: serverTimestamp() });
}

/** الحذف النهائي متاح فقط لقسم بلا تلاميذ (القواعد تفرض ذلك أيضًا). */
export async function deleteClass(uid: string, cls: ClassDoc) {
  const batch = writeBatch(db());
  cls.subjectIds.forEach((s) => batch.delete(assignmentRef(uid, cls.id, s)));
  batch.delete(doc(classesCol(uid), cls.id));
  await releaseSlot(batch, uid, cls.yearId, cls.id);
  await batch.commit();
}
