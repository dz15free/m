/* الصفحات الأولى في دفاتر الأستاذ: بطاقة الحالة الشخصية والمهنية، التوزيع
   الزمني الأسبوعي، وتوزيع المواد حسب الحصص والحجم الساعي — تُحسب من جدول التوقيت. */

import type { Slot } from "@/features/schedule/logic";
import { durationMinutes, periodOf } from "./logic.ts";

// ── بطاقة الحالة الشخصية والمهنية ──

export const CARD_FIELDS = [
  { key: "birthDate", type: "date", group: "personal" },
  { key: "birthPlace", type: "text", group: "personal" },
  { key: "birthWilaya", type: "text", group: "personal" },
  { key: "familyStatus", type: "text", group: "personal" },
  { key: "spouseJob", type: "text", group: "personal" },
  { key: "address", type: "text", group: "personal" },
  { key: "phone", type: "tel", group: "personal" },
  { key: "teachingLanguage", type: "text", group: "career" },
  { key: "firstDay", type: "date", group: "career" },
  { key: "schoolAppointment", type: "date", group: "career" },
  { key: "lastInspection", type: "date", group: "inspection" },
  { key: "inspector", type: "text", group: "inspection" },
  { key: "step", type: "text", group: "step" },
  { key: "stepDate", type: "date", group: "step" },
] as const;

export type CardKey = (typeof CARD_FIELDS)[number]["key"];
export type TeacherCard = Record<CardKey, string>;
export const CARD_GROUPS = ["personal", "career", "inspection", "step"] as const;
export const CARD_MAX = 120;

export const emptyCard = (): TeacherCard =>
  Object.fromEntries(CARD_FIELDS.map((f) => [f.key, ""])) as TeacherCard;

export function cleanCard(c: Partial<TeacherCard>): TeacherCard {
  const out = emptyCard();
  for (const f of CARD_FIELDS) {
    const v = (c[f.key] ?? "").replace(/\s+/g, " ").trim().slice(0, CARD_MAX);
    out[f.key] = f.type === "date" && v && !/^\d{4}-\d{2}-\d{2}$/.test(v) ? "" : v;
  }
  return out;
}

// ── التوزيع الزمني الأسبوعي ──

export type Range = { start: string; end: string };
export type PeriodGrid = { ranges: Range[]; cell: (day: number, r: Range) => Slot[] };

/** شبكة الفترة: صفوف = مجالات التوقيت المستعملة، أعمدة = أيام الدراسة. */
export function timetableGrid(slots: Slot[], period: "am" | "pm"): PeriodGrid {
  const inPeriod = slots.filter((s) => periodOf(s.start) === period);
  const seen = new Map<string, Range>();
  for (const s of inPeriod) seen.set(`${s.start}-${s.end}`, { start: s.start, end: s.end });
  const ranges = [...seen.values()].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  return {
    ranges,
    cell: (day, r) => inPeriod.filter((s) => s.day === day && s.start === r.start && s.end === r.end),
  };
}

// ── الحجم الساعي ──

export type SubjectLoad = { subjectId: string; sessions: number; minutes: number };

export function subjectLoad(slots: Slot[]): SubjectLoad[] {
  const map = new Map<string, SubjectLoad>();
  for (const s of slots) {
    const cur = map.get(s.subjectId) ?? { subjectId: s.subjectId, sessions: 0, minutes: 0 };
    cur.sessions += 1;
    cur.minutes += durationMinutes(s.start, s.end);
    map.set(s.subjectId, cur);
  }
  return [...map.values()].sort((a, b) => b.minutes - a.minutes);
}

/** 90 → «1:30» كما يُكتب الحجم الساعي. */
export const formatHours = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
