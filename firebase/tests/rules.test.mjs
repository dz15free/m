// اختبارات قواعد Firestore على المحاكي: npm run test:rules
import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, deleteDoc, writeBatch, Timestamp } from "firebase/firestore";

let env;

const A = { uid: "teacherA", email: "a@example.com" };
const B = { uid: "teacherB", email: "b@example.com" };

const dbAs = (user, claims = {}) =>
  env.authenticatedContext(user.uid, { email: user.email, ...claims }).firestore();

const anon = () => env.unauthenticatedContext().firestore();

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
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "homework", "x"), { a: 1 }));
  });
});

const cls = (extra = {}) => ({
  yearId: "2026-2027",
  schoolId: "s1",
  stage: "primary",
  level: "3AP",
  section: "01",
  displayName: "3AP-01",
  subjectIds: ["fr"],
  roster: [],
  studentCount: 0,
  archived: false,
  copiedFrom: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

const assignment = (classId, subjectId, extra = {}) => ({
  yearId: "2026-2027",
  schoolId: "s1",
  stage: "primary",
  classId,
  level: "3AP",
  subjectId,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

/** إنشاء قسم كما يفعل التطبيق: القسم + فهرس السنة في دفعة واحدة. */
const createClass = (db, id, indexIds = [id], extra = {}) => {
  const b = writeBatch(db);
  b.set(doc(db, "teachers", A.uid, "yearIndex", "2026-2027"), { classIds: indexIds, updatedAt: serverTimestamp() });
  b.set(doc(db, "teachers", A.uid, "classes", id), cls(extra));
  return b.commit();
};

describe("الأقسام والإسنادات", () => {
  it("المالك ينشئ قسمًا صحيحًا وإسناده", async () => {
    const db = dbAs(A);
    await assertSucceeds(createClass(db, "c1"));
    await assertSucceeds(setDoc(doc(db, "teachers", A.uid, "assignments", "c1__fr"), assignment("c1", "fr")));
    // قسم خارج الفهرس مرفوض
    await assertFails(setDoc(doc(db, "teachers", A.uid, "classes", "c2"), cls()));
  });

  it("يرفض قسمًا بتلاميذ أو حقول غريبة أو سنة خاطئة", async () => {
    const db = dbAs(A);
    await assertFails(setDoc(doc(db, "teachers", A.uid, "classes", "c2"), cls({ roster: [{ id: "x" }] })));
    await assertFails(setDoc(doc(db, "teachers", A.uid, "classes", "c3"), cls({ studentCount: 5 })));
    await assertFails(setDoc(doc(db, "teachers", A.uid, "classes", "c4"), cls({ yearId: "2026" })));
    await assertFails(setDoc(doc(db, "teachers", A.uid, "classes", "c5"), cls({ hack: true })));
  });

  it("معرّف الإسناد يجب أن يطابق القسم والمادة", async () => {
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "assignments", "other"), assignment("c1", "fr")));
  });

  it("التعديل: الاسم والمواد والأرشفة فقط، والحذف لقسم فارغ فقط", async () => {
    const db = dbAs(A);
    await createClass(db, "c1");
    await assertSucceeds(updateDoc(doc(db, "teachers", A.uid, "classes", "c1"), { displayName: "3AP-A", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "teachers", A.uid, "classes", "c1"), { level: "5AP", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "teachers", A.uid, "classes", "c1"), { studentCount: 3, updatedAt: serverTimestamp() }));
    const roster = [{ id: "s1", last: "بن عمر", first: "ياسين", gender: "M" }];
    await assertSucceeds(updateDoc(doc(db, "teachers", A.uid, "classes", "c1"), { roster, studentCount: 1, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "teachers", A.uid, "classes", "c1"), { roster, studentCount: 5, updatedAt: serverTimestamp() }));
    const big = Array.from({ length: 61 }, (_, i) => ({ id: `s${i}`, last: "x", first: "y", gender: null }));
    await assertFails(updateDoc(doc(db, "teachers", A.uid, "classes", "c1"), { roster: big, studentCount: 61, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, "teachers", A.uid, "classes", "c1")));
    await assertSucceeds(updateDoc(doc(db, "teachers", A.uid, "classes", "c1"), { roster: [], studentCount: 0, updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(db, "teachers", A.uid, "classes", "c1")));
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), "teachers", A.uid, "classes", "c9"), { ...cls(), studentCount: 30 }),
    );
    await assertFails(deleteDoc(doc(db, "teachers", A.uid, "classes", "c9")));
  });

  it("أستاذ آخر لا يرى أقسام غيره", async () => {
    await createClass(dbAs(A), "c1");
    await assertFails(getDoc(doc(dbAs(B), "teachers", A.uid, "classes", "c1")));
    await assertFails(setDoc(doc(dbAs(B), "teachers", A.uid, "assignments", "c1__fr"), assignment("c1", "fr")));
  });
});

const session = (extra = {}) => ({
  date: "2026-09-24",
  classId: "c1",
  part: "am",
  status: "held",
  attendance: { s1: "A" },
  counts: { p: 29, a: 1, l: 0, e: 0 },
  rosterSize: 30,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

describe("الحضور", () => {
  it("المالك يحفظ حصة صحيحة ويعدّلها", async () => {
    const db = dbAs(A);
    const ref = doc(db, "teachers", A.uid, "sessions", "2026-09-24_c1_am");
    await assertSucceeds(setDoc(ref, session()));
    await assertSucceeds(updateDoc(ref, { attendance: {}, counts: { p: 30, a: 0, l: 0, e: 0 }, updatedAt: serverTimestamp() }));
  });

  it("المفتاح يجب أن يطابق التاريخ والقسم والجزء", async () => {
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "sessions", "2026-09-25_c1_am"), session()));
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "sessions", "bad_c1_am"), session({ date: "bad" })));
  });

  it("يرفض حقولًا غريبة أو قوائم كبيرة", async () => {
    const big = Object.fromEntries(Array.from({ length: 61 }, (_, i) => [`s${i}`, "A"]));
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "sessions", "2026-09-24_c1_am"), session({ attendance: big })));
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "sessions", "2026-09-24_c1_am"), session({ grade: 20 })));
  });

  it("الإحصائيات: المالك فقط، وبحقول محددة", async () => {
    const ref = (db) => doc(db, "teachers", A.uid, "attendanceStats", "c1");
    await assertSucceeds(setDoc(ref(dbAs(A)), { sessions: 1, s: { s1: { a: 1 } }, m: {}, updatedAt: serverTimestamp() }));
    await assertFails(setDoc(ref(dbAs(A)), { hack: 1, updatedAt: serverTimestamp() }));
    await assertFails(getDoc(ref(dbAs(B))));
    await assertFails(getDoc(doc(dbAs(B), "teachers", A.uid, "sessions", "2026-09-24_c1_am")));
  });
});

describe("جدول التوقيت", () => {
  it("المالك يحفظ جدوله، ويُرفض الخاطئ أو الكبير", async () => {
    const ref = doc(dbAs(A), "teachers", A.uid, "schedules", "2026-2027");
    const slot = { id: "a", day: 0, start: "08:00", end: "09:00", classId: "c1", subjectId: "fr" };
    await assertSucceeds(setDoc(ref, { yearId: "2026-2027", slots: [slot], updatedAt: serverTimestamp() }));
    await assertFails(setDoc(ref, { yearId: "2027-2028", slots: [], updatedAt: serverTimestamp() }));
    await assertFails(setDoc(ref, { yearId: "2026-2027", slots: Array(81).fill(slot), updatedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(dbAs(B), "teachers", A.uid, "schedules", "2026-2027")));
  });
});

describe("دفاتر الأستاذ", () => {
  const lesson = (extra = {}) => ({
    date: "2026-09-27", classId: "c1", subjectId: "ar", start: "08:00", end: "09:00",
    activity: "قراءة", unit: "فهم المكتوب", title: "المدرسة", objective: "يقرأ نصًا قراءة سليمة", materials: "الكتاب", notes: "", status: "done",
    updatedAt: serverTimestamp(), ...extra,
  });

  it("سطر الدفتر اليومي: مفتاح مطابق وحقول محدودة", async () => {
    const col = (db) => (key) => doc(db, "teachers", A.uid, "lessons", key);
    await assertSucceeds(setDoc(col(dbAs(A))("2026-09-27_c1_ar_0800"), lesson()));
    await assertFails(setDoc(col(dbAs(A))("2026-09-27_c1_ar_0900"), lesson()));
    await assertFails(setDoc(col(dbAs(A))("2026-09-27_c1_ar_0800"), lesson({ status: "maybe" })));
    await assertFails(setDoc(col(dbAs(A))("2026-09-27_c1_ar_0800"), lesson({ notes: "x".repeat(401) })));
    await assertFails(setDoc(col(dbAs(A))("2026-09-27_c1_ar_0800"), lesson({ activity: "x".repeat(121) })));
    await assertFails(getDoc(col(dbAs(B))("2026-09-27_c1_ar_0800")));
  });

  it("دفتر التكوين والندوات", async () => {
    const ref = doc(dbAs(A), "teachers", A.uid, "trainings", "t1");
    const entry = {
      date: "2026-10-12", kind: "seminar", topic: "المقاربة بالكفاءات", place: "المدرسة", lesson: "قراءة", practitioner: "أ. سعاد",
      level: "3AP", supervisor: "المفتش", domain: "didactics", notes: "", updatedAt: serverTimestamp(),
    };
    await assertSucceeds(setDoc(ref, entry));
    await assertSucceeds(setDoc(ref, { ...entry, kind: "internship", domain: "" }));
    await assertFails(setDoc(ref, { ...entry, kind: "party" }));
    await assertFails(setDoc(ref, { ...entry, domain: "cooking" }));
    await assertFails(setDoc(ref, { ...entry, topic: "" }));
    await assertFails(getDoc(doc(dbAs(B), "teachers", A.uid, "trainings", "t1")));
  });

  it("بطاقة الحالة الشخصية والمهنية: لصاحبها فقط", async () => {
    const keys = ["birthDate", "birthPlace", "birthWilaya", "familyStatus", "spouseJob", "address", "phone", "teachingLanguage", "firstDay", "schoolAppointment", "lastInspection", "inspector", "step", "stepDate"];
    const card = { ...Object.fromEntries(keys.map((k) => [k, ""])), phone: "0555", updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(dbAs(A), "teachers", A.uid, "private", "card"), card));
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "private", "other"), card));
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "private", "card"), { ...card, salary: "1" }));
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "private", "card"), { ...card, address: "x".repeat(121) }));
    await assertFails(getDoc(doc(dbAs(B), "teachers", A.uid, "private", "card")));
    await assertFails(getDoc(doc(dbAs(A, { admin: true }), "teachers", B.uid, "private", "card")));
  });

  it("دفتر التنقيط: كشف القسم في الفصل", async () => {
    const ref = doc(dbAs(A), "teachers", A.uid, "grades", "c1__t1");
    const sheet = { classId: "c1", term: 1, marks: { s1: { ar_oral: 7.5 } }, updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(ref, sheet));
    await assertSucceeds(setDoc(ref, { marks: { s2: { math_numbers: 9 } }, updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "grades", "c1__t2"), sheet));
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "grades", "c1__t4"), { ...sheet, term: 4 }));
    await assertFails(setDoc(ref, { ...sheet, extra: true }));
    await assertFails(getDoc(doc(dbAs(B), "teachers", A.uid, "grades", "c1__t1")));
    await assertFails(getDoc(doc(dbAs(A, { admin: true }), "teachers", B.uid, "grades", "c1__t1")));
  });

  it("التوزيع السنوي", async () => {
    const ref = doc(dbAs(A), "teachers", A.uid, "progressions", "c1__ar");
    const prog = { classId: "c1", subjectId: "ar", startDate: "2026-09-20", rows: [{ w: 1, unit: "", content: "عائلتي", done: false }], updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(ref, prog));
    await assertFails(setDoc(doc(dbAs(A), "teachers", A.uid, "progressions", "c1__fr"), prog));
    await assertFails(setDoc(ref, { ...prog, startDate: "20/09/2026" }));
    await assertFails(setDoc(ref, { ...prog, rows: Array(201).fill(prog.rows[0]) }));
    await assertFails(getDoc(doc(dbAs(B), "teachers", A.uid, "progressions", "c1__ar")));
  });

  it("دفتر التحضير (المذكرات)", async () => {
    const ref = doc(dbAs(A), "teachers", A.uid, "preps", "p1");
    const phase = { situation: "نص", assessment: "" };
    const prep = {
      subjectId: "ar", gradeId: "3AP", domain: "فهم المكتوب", sequence: "1", activity: "قراءة", week: "2", content: "عائلتي",
      session: "1", objective: "يقرأ", values: "", materials: "", phases: { launch: phase, build: phase, invest: phase }, date: "",
      updatedAt: serverTimestamp(),
    };
    await assertSucceeds(setDoc(ref, prep));
    await assertFails(setDoc(ref, { ...prep, phases: { launch: phase, build: phase } }));
    await assertFails(setDoc(ref, { ...prep, phases: { ...prep.phases, build: { situation: "x".repeat(4001), assessment: "" } } }));
    await assertFails(setDoc(ref, { ...prep, secret: 1 }));
    await assertFails(getDoc(doc(dbAs(B), "teachers", A.uid, "preps", "p1")));
  });
});

describe("حدود الخطة", () => {
  const future = () => Timestamp.fromMillis(Date.now() + 86_400_000);
  const past = () => Timestamp.fromMillis(Date.now() - 86_400_000);
  const asAdmin = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));

  it("المجاني: قسمان افتراضيًا، أو ما تحدّده plans/free", async () => {
    const db = dbAs(A);
    await assertSucceeds(createClass(db, "c1", ["c1"]));
    await assertSucceeds(createClass(db, "c2", ["c1", "c2"]));
    await assertFails(createClass(db, "c3", ["c1", "c2", "c3"]));
    await asAdmin((f) => setDoc(doc(f, "plans", "free"), { limits: { maxClasses: 3 } }));
    await assertSucceeds(createClass(db, "c3", ["c1", "c2", "c3"]));
  });

  it("التجربة أو الاشتراك الساري يرفع الحد، والمنتهي يعيده", async () => {
    const db = dbAs(A);
    const ent = (end) => ({ planId: "premium", status: "trial", currentPeriodEnd: end, limits: { maxClasses: 10 } });
    await asAdmin((f) => setDoc(doc(f, "entitlements", A.uid), ent(future())));
    await assertSucceeds(createClass(db, "c5", ["c1", "c2", "c3", "c4", "c5"]));
    await asAdmin((f) => setDoc(doc(f, "entitlements", A.uid), ent(past())));
    await assertFails(createClass(db, "c6", ["c1", "c2", "c3", "c4", "c5", "c6"]));
    // بعد الانتهاء: الأقسام الموجودة تبقى تعمل، والنقصان مسموح
    await assertSucceeds(updateDoc(doc(db, "teachers", A.uid, "classes", "c5"), { displayName: "X", updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(db, "teachers", A.uid, "yearIndex", "2026-2027"), { classIds: ["c1", "c2", "c3", "c5"], updatedAt: serverTimestamp() }));
  });

  it("قسم نشط أُخرج من الفهرس يصبح للقراءة فقط، والمؤرشف مسموح", async () => {
    const db = dbAs(A);
    await createClass(db, "c1", ["c1"]);
    await setDoc(doc(db, "teachers", A.uid, "yearIndex", "2026-2027"), { classIds: [], updatedAt: serverTimestamp() });
    await assertFails(updateDoc(doc(db, "teachers", A.uid, "classes", "c1"), { displayName: "X", updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db, "teachers", A.uid, "classes", "c1"), { archived: true, updatedAt: serverTimestamp() }));
  });

  it("أحد لا يكتب اشتراكه بنفسه", async () => {
    await assertFails(setDoc(doc(dbAs(A), "entitlements", A.uid), { status: "active" }));
    await assertFails(setDoc(doc(dbAs(A), "yearIndex", "x"), { classIds: [] }));
  });
});

describe("الدفع اليدوي", () => {
  const asAdmin = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));
  const mp = (extra = {}) => ({
    uid: A.uid, teacherName: "كريم", email: A.email, planId: "premium", expectedAmount: 2500, declaredAmount: 2500,
    method: "baridimob", paidAt: "2026-09-25", transactionRef: "123456",
    receiptKey: `receipts/${A.uid}/2026/0f8fad5b-d9cb-469f-a165-70867728950e.jpg`, receiptHash: "a".repeat(64),
    payRef: "P-7K3QX", status: "pending", createdAt: serverTimestamp(), ...extra,
  });

  it("الأستاذ ينشئ طلبه بالسعر الصحيح فقط، ولا يقبله بنفسه", async () => {
    await asAdmin((f) => setDoc(doc(f, "plans", "premium"), { active: true, priceDzd: 2500 }));
    const db = dbAs(A);
    await assertSucceeds(setDoc(doc(db, "manualPayments", "m1"), mp()));
    await assertFails(setDoc(doc(db, "manualPayments", "m2"), mp({ expectedAmount: 100 })));
    await assertFails(setDoc(doc(db, "manualPayments", "m3"), mp({ uid: B.uid })));
    await assertFails(setDoc(doc(db, "manualPayments", "m4"), mp({ status: "approved" })));
    await assertFails(setDoc(doc(db, "manualPayments", "m5"), mp({ receiptKey: `receipts/${B.uid}/2026/0f8fad5b-d9cb-469f-a165-70867728950e.jpg` })));
    await assertFails(updateDoc(doc(db, "manualPayments", "m1"), { status: "approved" }));
    await assertFails(getDoc(doc(dbAs(B), "manualPayments", "m1")));
    await assertSucceeds(getDoc(doc(dbAs(B, { finance: true }), "manualPayments", "m1")));
  });

  it("الإيرادات للمالية فقط، والطلبات لا يكتبها أحد من المتصفح", async () => {
    await assertFails(getDoc(doc(dbAs(A), "stats", "revenue_2026-09")));
    await assertSucceeds(getDoc(doc(dbAs(A, { finance: true }), "stats", "revenue_2026-09")));
    await assertFails(setDoc(doc(dbAs(A), "orders", "o1"), { uid: A.uid, status: "paid" }));
    await assertFails(setDoc(doc(dbAs(A, { admin: true }), "payments", "p1"), { uid: A.uid }));
  });
});

describe("مكتبة المحتوى", () => {
  const content = (extra = {}) => ({
    title: { ar: "مذكرة الألوان", fr: "" }, stage: "primary", level: "3AP", subject: "fr", language: "fr", type: "fiche",
    term: 1, unit: "", tags: [], excerpt: "", access: "free", author: "فريق المنصة", license: "original",
    files: [{ key: "content/a.pdf", name: "a.pdf", mime: "application/pdf", size: 1000 }], previewKey: "",
    status: "published", publishedAt: 1, updatedAt: serverTimestamp(), ...extra,
  });

  it("المحرّر وحده ينشر؛ المنشور عام والمسودة خاصة بالمحرّرين", async () => {
    const editor = dbAs(A, { contentEditor: true });
    await assertFails(setDoc(doc(dbAs(A), "contents", "c1"), content()));
    await assertSucceeds(setDoc(doc(editor, "contents", "c1"), content()));
    await assertSucceeds(setDoc(doc(editor, "contents", "d1"), content({ status: "draft", publishedAt: null })));
    await assertFails(setDoc(doc(editor, "contents", "c2"), content({ access: "gift" })));
    await assertFails(setDoc(doc(editor, "contents", "c2"), content({ title: { ar: "", fr: "" } })));
    await assertSucceeds(getDoc(doc(anon(), "contents", "c1")));
    await assertFails(getDoc(doc(dbAs(B), "contents", "d1")));
    await assertSucceeds(getDoc(doc(editor, "contents", "d1")));
  });

  it("فهرس المكتبة: قراءة عامة وكتابة للمحرّرين", async () => {
    const entry = { id: "c1", t: { ar: "x", fr: "" } };
    await assertFails(setDoc(doc(dbAs(A), "contentIndex", "primary"), { entries: [entry], updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(dbAs(A, { contentEditor: true }), "contentIndex", "primary"), { entries: [entry], updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(dbAs(A, { contentEditor: true }), "contentIndex", "college"), { entries: [], updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(anon(), "contentIndex", "primary")));
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
