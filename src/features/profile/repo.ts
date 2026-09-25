"use client";

import { collection, deleteField, doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import type { OnboardingInput, School, TeacherProfile } from "./types";

/* الوصول إلى بيانات الملف المهني. المكان الوحيد الذي يلمس Firestore لهذه الميزة. */

const teacherRef = (uid: string) => doc(getFirebase().db, "teachers", uid);
const schoolRef = (uid: string, id: string) => doc(getFirebase().db, "teachers", uid, "schools", id);

/** إنهاء معالج البداية: كتابة ذرّية واحدة (الملف + المؤسسة + السنة + علامة الإنهاء). */
export async function completeOnboarding(uid: string, input: OnboardingInput): Promise<void> {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  const schoolId = doc(collection(db, "teachers", uid, "schools")).id;
  const now = serverTimestamp();

  batch.set(teacherRef(uid), {
    ...cleanProfile(input.profile),
    activeYearId: input.year.id,
    primarySchoolId: schoolId,
    counters: { classes: 0, assignments: 0, students: 0 },
    createdAt: now,
    updatedAt: now,
  });
  batch.set(schoolRef(uid, schoolId), { ...cleanSchool(input.school), createdAt: now, updatedAt: now });
  batch.set(doc(db, "teachers", uid, "years", input.year.id), {
    academicYearId: input.year.id,
    label: input.year.label,
    status: "active",
    createdAt: now,
  });
  batch.update(doc(db, "users", uid), {
    displayName: `${input.profile.firstName} ${input.profile.lastName}`.trim().slice(0, 80),
    onboardingDone: true,
    updatedAt: now,
  });

  await batch.commit();
}

export type TeacherBundle = { profile: TeacherProfile; school: School | null };

export async function getTeacherBundle(uid: string): Promise<TeacherBundle | null> {
  const snap = await getDoc(teacherRef(uid));
  if (!snap.exists()) return null;
  const profile = snap.data() as TeacherProfile;
  const schoolSnap = profile.primarySchoolId ? await getDoc(schoolRef(uid, profile.primarySchoolId)) : null;
  return { profile, school: schoolSnap?.exists() ? (schoolSnap.data() as School) : null };
}

export async function saveProfileAndSchool(
  uid: string,
  schoolId: string,
  profile: Omit<TeacherProfile, "activeYearId" | "primarySchoolId" | "presetType">,
  school: School,
): Promise<void> {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  const now = serverTimestamp();
  batch.update(teacherRef(uid), {
    ...cleanProfile(profile),
    // الرجوع من «أخرى» إلى رتبة من القائمة يحذف النص اليدوي القديم
    ...(profile.gradeId === "other" ? {} : { gradeCustom: deleteField() }),
    updatedAt: now,
  });
  batch.update(schoolRef(uid, schoolId), { ...cleanSchool(school), updatedAt: now });
  batch.update(doc(db, "users", uid), {
    displayName: `${profile.firstName} ${profile.lastName}`.trim().slice(0, 80),
    updatedAt: now,
  });
  await batch.commit();
}

/* تنظيف قبل الكتابة: مسافات زائدة، و`gradeCustom` فقط عند اختيار «أخرى». */
function cleanProfile<T extends Partial<TeacherProfile>>(p: T): T {
  const out: Record<string, unknown> = {
    ...p,
    firstName: p.firstName?.trim(),
    lastName: p.lastName?.trim(),
    directorate: p.directorate?.trim(),
  };
  if (p.gradeId === "other") out.gradeCustom = (p.gradeCustom ?? "").trim();
  else delete out.gradeCustom;
  return out as T;
}

function cleanSchool(s: School): School {
  return { ...s, name: s.name.trim(), commune: s.commune.trim(), directorate: s.directorate.trim() };
}
