/* الوثائق الجاهزة: منطق نقي مختبر (كشف الغيابات الشهري، الصيغ حسب الجنس). */

import type { AttendanceMap } from "../attendance/logic.ts";

export type MonthSession = { date: string; part: string; attendance: AttendanceMap };
export type AbsenceRow = { studentId: string; cells: Record<string, string>; a: number; e: number; l: number };

const SYMBOL = { A: "غ", E: "م", L: "ت" } as const;
const SYMBOL_FR = { A: "A", E: "J", L: "R" } as const;

/** شبكة الشهر: أعمدة = أيام سُجّل فيها حضور، الخانة = رموز الفترات غير الحاضرة. */
export function absenceGrid(studentIds: string[], sessions: MonthSession[], locale: "ar" | "fr" = "ar") {
  const sym = locale === "fr" ? SYMBOL_FR : SYMBOL;
  const days = [...new Set(sessions.map((s) => s.date))].sort();
  const ordered = [...sessions].sort((x, y) => x.date.localeCompare(y.date) || x.part.localeCompare(y.part));
  const rows: AbsenceRow[] = studentIds.map((id) => {
    const row: AbsenceRow = { studentId: id, cells: {}, a: 0, e: 0, l: 0 };
    for (const s of ordered) {
      const m = s.attendance[id];
      if (!m) continue;
      row.cells[s.date] = (row.cells[s.date] ?? "") + sym[m];
      if (m === "A") row.a++;
      else if (m === "E") row.e++;
      else row.l++;
    }
    return row;
  });
  return { days, rows, sessions: sessions.length };
}

/** أول يوم وآخر يوم في الشهر (YYYY-MM). */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

/** «التلميذ» / «التلميذة» / «التلميذ(ة)» حسب ما هو معروف. */
export function pupilWord(gender: "M" | "F" | null, locale: "ar" | "fr"): string {
  if (locale === "fr") return "l'élève";
  return gender === "F" ? "التلميذة" : gender === "M" ? "التلميذ" : "التلميذ(ة)";
}
