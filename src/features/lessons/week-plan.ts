/* توزيع حصص الأسبوع حسب مدد جدول التوقيت (ساعة / نصف ساعة):
   - اللغة العربية (3، 4، 5 ابتدائي): «توزيع حصص اللغة العربية» — 9 حصص، 6سا30د في الأسبوع.
     حصة الجدول تأخذ الحصة المكتوبة فيها («فهم المنطوق (30)») إن وُجدت، وإلا الحصة التالية التي تساوي مدتها.
   - الرياضيات: حصص الساعة تأخذ دروس الأسبوع بالترتيب، وحصة نصف الساعة تدريبٌ على آخر درس.
   null ⇐ لا توزيع خاص (يبقى ترتيب المذكرات حصة لحصة). */
import { nameKey } from "../../shared/text/names.ts";
import type { Curriculum, CurriculumEntry, SlotRef } from "./logic.ts";

export type PlanRef = SlotRef & { /** ما كُتب في خلية الجدول («قراءة (الظاهرة النحوية)») */ label?: string };
type Cur = Pick<Curriculum, "level" | "subject" | "entries" | "segments">;
type Session = { name: string; min: number; label: RegExp; match: RegExp[] };

/** ترتيب الوثيقة الرسمية؛ «label» على النص الموحَّد (بلا همزات، ة ← ه). */
export const AR_SESSIONS: Session[] = [
  { name: "قراءة (أداء وفهم)", min: 60, label: /اداء|فهم المكتوب|^قراءه$/, match: [/أداء وفهم/, /فهم المكتوب/] },
  { name: "فهم المنطوق", min: 30, label: /منطوق/, match: [/فهم المنطوق/] },
  { name: "تعبير شفهي", min: 30, label: /تعبير (?:ال)?شف/, match: [/الأساليب والصيغ/, /التعبير الشفوي/, /فهم المنطوق/] },
  { name: "إنتاج شفوي", min: 30, label: /انتاج (?:ال)?شف/, match: [/الإنتاج الشفوي/, /فهم المنطوق والتعبير/, /فهم المنطوق/] },
  { name: "قراءة + نحو", min: 60, label: /نحو|تراكيب/, match: [/نحو/, /تراكيب/] },
  { name: "قراءة + صرف أو إملاء", min: 60, label: /صرف|املاء/, match: [/صرف/, /إملاء/] },
  { name: "محفوظات", min: 30, label: /محفوظ/, match: [/المحفوظات/] },
  { name: "مطالعة", min: 30, label: /مطالع/, match: [/مطالعة/] },
  { name: "إنتاج كتابي", min: 60, label: /انتاج (?:ال)?كتاب|تعبير (?:ال)?كتاب/, match: [/إنتاج كتابي/, /التعبير الكتابي/] },
];
export const AR_LEVELS = new Set(["3AP", "4AP", "5AP"]);

/** «1 سا»، «1 سا 30 د»، «30 د» */
export const formatMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} سا${m % 60 ? ` ${m % 60} د` : ""}` : `${m} د`);

const byTime = (a: SlotRef, b: SlotRef) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start);
const textOf = (e: CurriculumEntry) => `${e.ss ?? ""} ${e.a} ${e.t}`;
const labelKey = (label: string) => nameKey(label.replace(/\(\s*[\d٠-٩]+\s*(?:سا|د)?\s*[\d٠-٩]*\s*\)/g, " "));

/** حصة العربية التي يسمّيها نص الجدول، أو -1. */
export function arSessionOfLabel(label: string | undefined): number {
  if (!label) return -1;
  const k = labelKey(label);
  // الأخصّ أولًا: «قراءة (الظاهرة النحوية)» نحو لا «قراءة»
  for (const i of [8, 3, 2, 1, 4, 5, 6, 7, 0]) if (AR_SESSIONS[i]!.label.test(k)) return i;
  return -1;
}

export function arabicWeekPlan(cur: Cur, week: number, refs: PlanRef[]): Map<string, CurriculumEntry[]> | null {
  if (cur.subject !== "ar" || !AR_LEVELS.has(cur.level)) return null;
  const fiches = cur.entries.filter((e) => e.k === "week" && e.u === week).sort((a, b) => a.o - b.o);
  // أسبوع إدماج أو تقويم (حصصه لا تشبه التوزيع): يبقى ترتيب المذكرات
  const known = AR_SESSIONS.filter((s) => s.match.some((re) => fiches.some((f) => re.test(textOf(f))))).length;
  if (known < 5) return null;
  const sorted = [...refs].sort(byTime);
  const used = new Set<number>();
  const picks = new Map<string, number[]>();
  for (const r of sorted) {
    const i = arSessionOfLabel(r.label);
    if (i >= 0 && !used.has(i)) {
      used.add(i);
      picks.set(r.key, [i]);
    }
  }
  const free = (pred: (s: Session) => boolean) => AR_SESSIONS.findIndex((s, k) => !used.has(k) && pred(s));
  for (const r of sorted) {
    if (picks.has(r.key)) continue;
    const list: number[] = [];
    let rest = r.minutes ?? 60;
    while (rest > 0) {
      let i = free((s) => s.min === rest);
      if (i < 0) i = free((s) => s.min <= rest);
      if (i < 0) break;
      used.add(i);
      list.push(i);
      rest -= AR_SESSIONS[i]!.min;
    }
    // حصة أقصر من كل ما بقي (مثلًا 45 د): الحصة التالية
    if (!list.length) {
      const i = free(() => true);
      if (i >= 0) {
        used.add(i);
        list.push(i);
      }
    }
    picks.set(r.key, list);
  }
  const segTitle = cur.segments.find((s) => s.n === fiches[0]?.s)?.title ?? "";
  const out = new Map<string, CurriculumEntry[]>();
  for (const r of sorted) {
    const list = picks.get(r.key) ?? [];
    if (!list.length) continue;
    out.set(
      r.key,
      list.map((i) => {
        const s = AR_SESSIONS[i]!;
        let f: CurriculumEntry | undefined;
        for (const re of s.match) if ((f = fiches.find((e) => re.test(textOf(e))))) break;
        const min = list.length === 1 && r.minutes ? r.minutes : s.min;
        return { id: f?.id ?? "", o: f?.o ?? 0, s: f?.s ?? fiches[0]?.s ?? 0, k: "week", u: week, a: s.name, ss: `${s.name} (${formatMinutes(min)})`, d: f?.d ?? "", t: f?.t ?? segTitle, b: f?.b ?? false, sm: f?.sm ?? false };
      }),
    );
  }
  return out;
}

export function mathWeekPlan(cur: Cur, week: number, refs: PlanRef[]): Map<string, CurriculumEntry[]> | null {
  if (cur.subject !== "math") return null;
  // بلا حصص نصف ساعة: كل حصة درس (الترتيب العادي)
  if (!refs.some((r) => r.minutes && r.minutes <= 30)) return null;
  const lessons = cur.entries.filter((e) => e.k === "week" && e.u === week).sort((a, b) => a.o - b.o);
  if (!lessons.length) return null;
  const out = new Map<string, CurriculumEntry[]>();
  const sorted = [...refs].sort(byTime);
  let i = 0;
  let last: CurriculumEntry | null = null;
  sorted.forEach((r, k) => {
    const short = !!r.minutes && r.minutes <= 30;
    // نصف ساعة: تدريب على آخر درس — إلا إن لم يُقدَّم درس بعد وبقيت دروس أكثر من حصص الساعة الباقية
    const longLeft = sorted.slice(k + 1).filter((x) => !(x.minutes && x.minutes <= 30)).length;
    if (short && last && lessons.length - i <= longLeft) {
      out.set(r.key, [{ ...last, a: "تدريب وتطبيقات", ss: `تدريب وتطبيقات (${formatMinutes(r.minutes!)})` }]);
      return;
    }
    if (i < lessons.length) {
      last = lessons[i++]!;
      out.set(r.key, [{ ...last, ss: `${last.ss && last.ss !== last.a ? `${last.ss} ` : ""}(${formatMinutes(r.minutes ?? 60)})` }]);
    } else if (last) {
      out.set(r.key, [{ ...last, a: "تدريب وتطبيقات", ss: `تدريب وتطبيقات (${formatMinutes(r.minutes ?? 60)})` }]);
    }
  });
  return out;
}
