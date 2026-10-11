import { wilayaByCode } from "../shared/dz/wilayas.ts";

/* لغة الوثيقة: مذكرات الفرنسية والإنجليزية وتوزيعاتها تُكتب بلغة المادة نفسها (عناوين الحقول، الأسابيع، الأشهر، الرأس
   والتوقيعات) أيًّا كانت لغة الواجهة؛ أزرار التطبيق تبقى بلغة الواجهة. */
export type DocLang = "fr" | "en";

export const docLangOfSubject = (subjectId: string | undefined): DocLang | null => (subjectId === "fr" || subjectId === "en" ? subjectId : null);

/** لغة وثيقة تضم هذه المواد: لغتها الأجنبية إن كانت كلها بها، وإلا null (لغة الواجهة). */
export function docLangOf(subjectIds: string[]): DocLang | null {
  const langs = subjectIds.map(docLangOfSubject);
  return langs.length > 0 && langs.every((l) => l && l === langs[0]) ? langs[0]! : null;
}

const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

export const DOC = {
  fr: {
    subject: "Langue française",
    // المذكرة
    segment: "Séquence",
    unit: "Période",
    activity: "Activité",
    domain: "Domaine",
    materials: "Matériel",
    objectives: "Objectifs d'apprentissage",
    process: "Déroulement",
    original: "La fiche telle que dans le document du ministère",
    week: (n: number) => `Semaine ${n}`,
    day: (n: number) => `Jour ${n}`,
    page: (n: number) => `Page ${n}`,
    sessionsCount: (n: number) => (n === 1 ? "1 séance" : `${n} séances`),
    // التوزيع السنوي
    annualTitle: "Progression annuelle",
    monthlyTitle: "Progression mensuelle",
    weekCol: "Semaine",
    unitCol: "Séquence / unité",
    content: "Contenu / thème",
    done: "Fait",
    thisWeek: "Cette semaine",
    // التوزيع الشهري
    sheetTitle: (month: string) => `Progression mensuelle — ${month}`,
    weeks: "Semaines",
    sessions: "Séances",
    schoolWeek: (n: number) => `Semaine ${n}`,
    weeksCount: (n: number) => (n === 1 ? "1 semaine de classe" : `${n} semaines de classe`),
    exams: (term: number) => `Examens du ${term === 1 ? "1er" : `${term}e`} trimestre`,
    examsShort: "Examens",
    holidayName: "Vacances",
    holiday: (name: string, from: string, to: string) => `${name} : du ${from} au ${to}`,
    calendarNote: "Vacances et examens ce mois-ci :",
    noWeeks: "Aucune semaine de classe ce mois-ci.",
    signTeacher: "L'enseignant(e)",
    signDirector: "Le directeur / la directrice",
    signInspector: "L'inspecteur / l'inspectrice",
    // الرأس
    republic: "République Algérienne Démocratique et Populaire",
    ministry: "Ministère de l'Éducation nationale",
    directorate: (wilaya: string) => `Direction de l'éducation de ${wilaya}`,
    teacher: "Enseignant(e)",
    school: "École",
    level: "Niveau",
    year: "Année scolaire",
  },
  en: {
    subject: "English",
    segment: "Sequence",
    unit: "Period",
    activity: "Activity",
    domain: "Domain",
    materials: "Resources",
    objectives: "Learning objectives",
    process: "Procedure",
    original: "The lesson plan as in the ministry document",
    week: (n: number) => `Week ${n}`,
    day: (n: number) => `Day ${n}`,
    page: (n: number) => `Page ${n}`,
    sessionsCount: (n: number) => (n === 1 ? "1 session" : `${n} sessions`),
    annualTitle: "Yearly Planning",
    monthlyTitle: "Monthly Distribution",
    weekCol: "Week",
    unitCol: "Sequence / unit",
    content: "Content / topic",
    done: "Done",
    thisWeek: "This week",
    sheetTitle: (month: string) => `Monthly Distribution — ${month}`,
    weeks: "Weeks",
    sessions: "Sessions",
    schoolWeek: (n: number) => `Week ${n}`,
    weeksCount: (n: number) => (n === 1 ? "1 school week" : `${n} school weeks`),
    exams: (term: number) => `${ordinal(term)} term exams`,
    examsShort: "Exams",
    holidayName: "Holidays",
    holiday: (name: string, from: string, to: string) => `${name}: from ${from} to ${to}`,
    calendarNote: "Holidays and exams this month:",
    noWeeks: "No school weeks this month.",
    signTeacher: "Teacher",
    signDirector: "Headmaster",
    signInspector: "Inspector",
    republic: "People's Democratic Republic of Algeria",
    ministry: "Ministry of National Education",
    directorate: (wilaya: string) => `Education Directorate of ${wilaya}`,
    teacher: "Teacher",
    school: "School",
    level: "Level",
    year: "Academic Year",
  },
} as const;

export type DocLabels = (typeof DOC)[DocLang];

/** اسم الشهر بلغة الوثيقة: « octobre 2026 » / "October 2026". */
export function docMonth(month: string, lang: DocLang): string {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-DZ" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`));
}

/** المستوى بلغة الوثيقة (الفرنسية من التصنيف): "5th Grade — Primary School". */
export function docLevel(level: { id: string; order: number; label: { fr: string } } | undefined, lang: DocLang, fallback: string): string {
  if (!level) return fallback;
  if (lang === "fr") return level.label.fr;
  if (level.id === "PRE") return "Preschool";
  return `${ordinal(level.order)} Grade — ${/AM$/.test(level.id) ? "Middle School" : /AS$/.test(level.id) ? "Secondary School" : "Primary School"}`;
}

/** اسم العطلة بلغة الوثيقة (أسماء الرزنامة عربية/فرنسية؛ الإنجليزية من الفرنسية). */
export function docHoliday(label: { fr: string } | undefined, lang: DocLang): string {
  if (!label) return DOC[lang].holidayName;
  if (lang === "fr") return label.fr;
  const f = label.fr.toLowerCase();
  return f.includes("automne") ? "Autumn holidays" : f.includes("hiver") ? "Winter holidays" : f.includes("printemps") ? "Spring holidays" : f.includes("été") ? "Summer holidays" : label.fr;
}

/** المديرية بلغة الوثيقة من رمز الولاية (المحفوظة في الملف عربية غالبًا). */
export function docDirectorate(wilayaCode: number | undefined, lang: DocLang, fallback: string): string {
  const w = wilayaCode ? wilayaByCode(wilayaCode) : undefined;
  return w ? DOC[lang].directorate(w.fr) : fallback;
}
