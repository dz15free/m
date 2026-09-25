import { cleanName, nameKey, similarity } from "../../shared/text/names.ts";

/* قائمة تلاميذ القسم مضمّنة في مستند القسم (قراءة واحدة لفتح القسم).
   الترتيب = ترتيب المصفوفة، ورقم التلميذ يُعرض من موضعه. كل العمليات
   هنا دوال نقية (بلا Firestore) ومختبرة. */

export type Gender = "M" | "F";
export type Student = { id: string; last: string; first: string; gender: Gender | null };
export type StudentInput = { last: string; first: string; gender?: Gender | null };

export const MAX_STUDENTS = 60;
export const MAX_NAME = 60;

export function newStudentId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

function toStudent(input: StudentInput, id = newStudentId()): Student {
  return {
    id,
    last: cleanName(input.last).slice(0, MAX_NAME),
    first: cleanName(input.first).slice(0, MAX_NAME),
    gender: input.gender ?? null,
  };
}

export function isValidInput(input: StudentInput): boolean {
  return cleanName(input.last).length > 0 || cleanName(input.first).length > 0;
}

export class RosterFullError extends Error {}

export function addStudents(roster: Student[], inputs: StudentInput[]): Student[] {
  const added = inputs.filter(isValidInput).map((i) => toStudent(i));
  if (roster.length + added.length > MAX_STUDENTS) throw new RosterFullError();
  return [...roster, ...added];
}

export function updateStudent(roster: Student[], id: string, patch: StudentInput): Student[] {
  return roster.map((s) => (s.id === id ? toStudent({ ...s, ...patch }, id) : s));
}

export function removeStudents(roster: Student[], ids: ReadonlySet<string>): Student[] {
  return roster.filter((s) => !ids.has(s.id));
}

export function setGender(roster: Student[], ids: ReadonlySet<string>, gender: Gender | null): Student[] {
  return roster.map((s) => (ids.has(s.id) ? { ...s, gender } : s));
}

/** ترتيب أبجدي باللقب ثم الاسم (العربية قبل اللاتينية كما في القوائم الرسمية). */
export function sortAlphabetically(roster: Student[]): Student[] {
  const collator = new Intl.Collator(["ar", "fr"], { sensitivity: "base" });
  return [...roster].sort((a, b) => collator.compare(a.last, b.last) || collator.compare(a.first, b.first));
}

/** نقل تلاميذ من قسم إلى آخر بنفس المعرّفات (يبقى تاريخهم مرتبطًا بهم). */
export function moveStudents(from: Student[], to: Student[], ids: ReadonlySet<string>) {
  const moving = from.filter((s) => ids.has(s.id));
  if (to.length + moving.length > MAX_STUDENTS) throw new RosterFullError();
  return { from: removeStudents(from, ids), to: [...to, ...moving] };
}

export function fullName(s: Pick<Student, "last" | "first">): string {
  return `${s.last} ${s.first}`.trim();
}

export function searchRoster(roster: Student[], query: string): Student[] {
  const q = nameKey(query);
  if (!q) return roster;
  return roster.filter((s) => nameKey(fullName(s)).includes(q) || nameKey(`${s.first} ${s.last}`).includes(q));
}

/** أزواج مكرّرة محتملة (نفس الاسم بعد التوحيد، أو تشابه عالٍ). */
export function findDuplicates(roster: Student[], threshold = 0.9): [Student, Student][] {
  const pairs: [Student, Student][] = [];
  for (let i = 0; i < roster.length; i++) {
    for (let j = i + 1; j < roster.length; j++) {
      if (similarity(fullName(roster[i]!), fullName(roster[j]!)) >= threshold) pairs.push([roster[i]!, roster[j]!]);
    }
  }
  return pairs;
}

/** CSV بترميز UTF-8 مع BOM حتى يفتحه Excel بالعربية صحيحًا. */
export function rosterToCsv(roster: Student[], headers: { n: string; last: string; first: string; gender: string }, genderLabel: (g: Gender) => string): string {
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [
    [headers.n, headers.last, headers.first, headers.gender],
    ...roster.map((s, i) => [String(i + 1), s.last, s.first, s.gender ? genderLabel(s.gender) : ""]),
  ];
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}
