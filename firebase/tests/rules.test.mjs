// اختبارات قواعد Firestore على المحاكي: npm run test:rules
import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

let env;

const A = { uid: "teacherA", email: "a@example.com" };
const B = { uid: "teacherB", email: "b@example.com" };

const dbAs = (user, claims = {}) =>
  env.authenticatedContext(user.uid, { email: user.email, ...claims }).firestore();

const newUser = (user, extra = {}) => ({
  displayName: "أستاذ",
  email: user.email,
  locale: "ar",
  onboardingDone: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "prof-baczone-rules-test",
    firestore: { rules: readFileSync("firebase/firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});

beforeEach(() => env.clearFirestore());
after(() => env.cleanup());

describe("users/{uid}", () => {
  it("يسمح للمستخدم بإنشاء مستنده الصحيح", async () => {
    await assertSucceeds(setDoc(doc(dbAs(A), "users", A.uid), newUser(A)));
  });

  it("يرفض إنشاء مستند مستخدم آخر", async () => {
    await assertFails(setDoc(doc(dbAs(A), "users", B.uid), newUser(B)));
  });

  it("يرفض بريدًا لا يطابق رمز الهوية", async () => {
    await assertFails(setDoc(doc(dbAs(A), "users", A.uid), newUser(A, { email: "x@example.com" })));
  });

  it("يرفض حقلًا غير مسموح (مثل role للترقية الذاتية)", async () => {
    await assertFails(setDoc(doc(dbAs(A), "users", A.uid), newUser(A, { role: "admin" })));
  });

  it("يرفض لغة غير مدعومة واسمًا طويلًا", async () => {
    await assertFails(setDoc(doc(dbAs(A), "users", A.uid), newUser(A, { locale: "en" })));
    await assertFails(setDoc(doc(dbAs(A), "users", A.uid), newUser(A, { displayName: "x".repeat(81) })));
  });

  it("المالك يقرأ ويعدّل الحقول المسموحة فقط، ولا يحذف", async () => {
    const db = dbAs(A);
    await setDoc(doc(db, "users", A.uid), newUser(A));
    await assertSucceeds(getDoc(doc(db, "users", A.uid)));
    await assertSucceeds(
      updateDoc(doc(db, "users", A.uid), { locale: "fr", onboardingDone: true, updatedAt: serverTimestamp() }),
    );
    await assertFails(updateDoc(doc(db, "users", A.uid), { email: "new@example.com", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "users", A.uid), { onboardingDone: false, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, "users", A.uid)));
  });

  it("لا يقرأ أستاذ مستند أستاذ آخر، والأدمن يقرأ", async () => {
    await setDoc(doc(dbAs(A), "users", A.uid), newUser(A));
    await assertFails(getDoc(doc(dbAs(B), "users", A.uid)));
    await assertSucceeds(getDoc(doc(dbAs(B, { admin: true }), "users", A.uid)));
  });

  it("الزائر غير المسجّل لا يقرأ شيئًا", async () => {
    await setDoc(doc(dbAs(A), "users", A.uid), newUser(A));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "users", A.uid)));
  });
});

const teacher = (extra = {}) => ({
  firstName: "كريم",
  lastName: "بن عمر",
  stage: "primary",
  gradeId: "p_teacher",
  wilayaCode: 16,
  directorate: "مديرية التربية لولاية الجزائر وسط",
  presetType: "primarySubject",
  activeYearId: "2026-2027",
  primarySchoolId: "s1",
  counters: { classes: 0, assignments: 0, students: 0 },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

const school = (extra = {}) => ({
  name: "مدرسة الشهيد أحمد زبانة",
  wilayaCode: 16,
  commune: "باب الوادي",
  stage: "primary",
  directorate: "مديرية التربية لولاية الجزائر وسط",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

const year = (extra = {}) => ({
  academicYearId: "2026-2027",
  label: "2026/2027",
  status: "active",
  createdAt: serverTimestamp(),
  ...extra,
});

describe("teachers/{uid} — الملف المهني", () => {
  it("المالك ينشئ ملفه الصحيح ويقرؤه", async () => {
    const db = dbAs(A);
    await assertSucceeds(setDoc(doc(db, "teachers", A.uid), teacher()));
    await assertSucceeds(getDoc(doc(db, "teachers", A.uid)));
  });

  it("يرفض العدّادات غير الصفرية والحقول الناقصة أو الغريبة", async () => {
    const db = dbAs(A);
    await assertFails(setDoc(doc(db, "teachers", A.uid), teacher({ counters: { classes: 99, assignments: 0, students: 0 } })));
    await assertFails(setDoc(doc(db, "teachers", A.uid), teacher({ firstName: "" })));
    await assertFails(setDoc(doc(db, "teachers", A.uid), teacher({ plan: "premium" })));
    await assertFails(setDoc(doc(db, "teachers", A.uid), teacher({ stage: "university" })));
    await assertFails(setDoc(doc(db, "teachers", A.uid), teacher({ activeYearId: "2026/2027" })));
  });

  it("التعديل يمس الحقول المهنية فقط، لا العدّادات", async () => {
    const db = dbAs(A);
    await setDoc(doc(db, "teachers", A.uid), teacher());
    await assertSucceeds(updateDoc(doc(db, "teachers", A.uid), { gradeId: "other", gradeCustom: "أستاذ", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "teachers", A.uid), { "counters.classes": 50, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, "teachers", A.uid)));
  });

  it("المؤسسة والسنة: إنشاء صحيح، ورفض القيم الخاطئة", async () => {
    const db = dbAs(A);
    await assertSucceeds(setDoc(doc(db, "teachers", A.uid, "schools", "s1"), school()));
    await assertFails(setDoc(doc(db, "teachers", A.uid, "schools", "s2"), school({ name: "" })));
    await assertFails(setDoc(doc(db, "teachers", A.uid, "schools", "s3"), school({ secret: 1 })));
    await assertSucceeds(setDoc(doc(db, "teachers", A.uid, "years", "2026-2027"), year()));
    await assertFails(setDoc(doc(db, "teachers", A.uid, "years", "2027-2028"), year()));
    await assertSucceeds(updateDoc(doc(db, "teachers", A.uid, "years", "2026-2027"), { status: "archived" }));
    await assertFails(updateDoc(doc(db, "teachers", A.uid, "years", "2026-2027"), { label: "x" }));
  });

  it("أستاذ آخر لا يقرأ ولا يكتب — ولا الأدمن", async () => {
    await setDoc(doc(dbAs(A), "teachers", A.uid), teacher());
    await setDoc(doc(dbAs(A), "teachers", A.uid, "schools", "s1"), school());
    await assertFails(getDoc(doc(dbAs(B), "teachers", A.uid)));
    await assertFails(getDoc(doc(dbAs(B), "teachers", A.uid, "schools", "s1")));
    await assertFails(setDoc(doc(dbAs(B), "teachers", A.uid, "schools", "s9"), school()));
    await assertFails(getDoc(doc(dbAs(B, { admin: true }), "teachers", A.uid)));
  });

  it("المجموعات الفرعية غير المعرّفة بعد مغلقة حتى للمالك", async () => {
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "classes", "c1"), { displayName: "3AP-01" }));
  });
});

describe("المال والاشتراكات", () => {
  it("لا يستطيع أحد من المتصفح كتابة الاشتراك — ولا الأدمن", async () => {
    await assertFails(setDoc(doc(dbAs(A), "entitlements", A.uid), { planId: "premium" }));
    await assertFails(setDoc(doc(dbAs(A, { admin: true }), "entitlements", A.uid), { planId: "premium" }));
  });

  it("المالك يقرأ اشتراكه فقط", async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), "entitlements", A.uid), { planId: "free" }),
    );
    await assertSucceeds(getDoc(doc(dbAs(A), "entitlements", A.uid)));
    await assertFails(getDoc(doc(dbAs(B), "entitlements", A.uid)));
  });

  it("الطلبات والدفعات: قراءة للمالك، كتابة ممنوعة", async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), "payments", "p1"), { uid: A.uid, gross: 1000 }),
    );
    await assertSucceeds(getDoc(doc(dbAs(A), "payments", "p1")));
    await assertFails(getDoc(doc(dbAs(B), "payments", "p1")));
    await assertFails(setDoc(doc(dbAs(A), "payments", "p2"), { uid: A.uid, gross: 1 }));
  });
});

describe("البيانات المرجعية والمسارات غير المعرّفة", () => {
  it("الجميع يقرأ الخطط، والأدمن وحده يكتب", async () => {
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), "plans", "free")));
    await assertFails(setDoc(doc(dbAs(A), "plans", "free"), { price: 0 }));
    await assertSucceeds(setDoc(doc(dbAs(A, { admin: true }), "plans", "free"), { price: 0 }));
  });

  it("أي مجموعة غير معرّفة مغلقة", async () => {
    await assertFails(setDoc(doc(dbAs(A), "anything", "x"), { a: 1 }));
    await assertFails(getDoc(doc(dbAs(A, { admin: true }), "anything", "x")));
  });
});
