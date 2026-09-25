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

describe("teachers/{uid}/** — عزل مساحة الأستاذ", () => {
  it("المالك يكتب ويقرأ مساحته بكل مستوياتها", async () => {
    const db = dbAs(A);
    await assertSucceeds(setDoc(doc(db, "teachers", A.uid), { firstName: "أ" }));
    await assertSucceeds(setDoc(doc(db, "teachers", A.uid, "classes", "c1"), { displayName: "3AP-01" }));
    await assertSucceeds(getDoc(doc(db, "teachers", A.uid, "classes", "c1")));
  });

  it("أستاذ آخر لا يقرأ ولا يكتب — ولا الأدمن يقرأ أسماء التلاميذ", async () => {
    await setDoc(doc(dbAs(A), "teachers", A.uid, "classes", "c1"), { displayName: "3AP-01" });
    await assertFails(getDoc(doc(dbAs(B), "teachers", A.uid, "classes", "c1")));
    await assertFails(setDoc(doc(dbAs(B), "teachers", A.uid, "classes", "c2"), { x: 1 }));
    await assertFails(getDoc(doc(dbAs(B, { admin: true }), "teachers", A.uid, "classes", "c1")));
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
