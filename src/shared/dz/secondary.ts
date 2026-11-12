/* التعليم الثانوي العام والتكنولوجي: السنة الأولى جذعان مشتركان، والثانية والثالثة ست شعب.
   كل (سنة × شعبة) مستوى مستقل في التصنيف («2AS-SE»)، فيُنشئ الأستاذ أقسامه بشعبتها («2AS-SE-01»)
   وتأتيه مواد شعبته ومذكراتها. الشعب التي تدرس المادة نفسها بالبرنامج نفسه تتشارك منهاجًا واحدًا (PROGRAMS). */

export type Localized = { ar: string; fr: string; en: string };

export const STREAMS = {
  ST: { ar: "جذع مشترك علوم وتكنولوجيا", short: "ج م ع ت", fr: "Tronc commun sciences et technologie", en: "Common Core — Science and Technology" },
  L: { ar: "جذع مشترك آداب", short: "ج م آ", fr: "Tronc commun lettres", en: "Common Core — Humanities" },
  SE: { ar: "علوم تجريبية", short: "ع ت", fr: "Sciences expérimentales", en: "Experimental Sciences" },
  M: { ar: "رياضيات", short: "ر", fr: "Mathématiques", en: "Mathematics" },
  TM: { ar: "تقني رياضي", short: "ت ر", fr: "Technique mathématique", en: "Technical Mathematics" },
  GE: { ar: "تسيير واقتصاد", short: "ت ا", fr: "Gestion et économie", en: "Management and Economics" },
  LP: { ar: "آداب وفلسفة", short: "آ ف", fr: "Lettres et philosophie", en: "Humanities and Philosophy" },
  LE: { ar: "لغات أجنبية", short: "ل أ", fr: "Langues étrangères", en: "Foreign Languages" },
} as const;
export type Stream = keyof typeof STREAMS;

export const YEAR_STREAMS: Record<1 | 2 | 3, readonly Stream[]> = {
  1: ["ST", "L"],
  2: ["SE", "M", "TM", "GE", "LP", "LE"],
  3: ["SE", "M", "TM", "GE", "LP", "LE"],
};

/** «2AS-SE» ⇐ سنة 2 وشعبة SE؛ غير ذلك null. */
export function parseSecondary(level: string): { year: 1 | 2 | 3; stream: Stream } | null {
  const m = /^([1-3])AS-([A-Z]+)$/.exec(level);
  if (!m) return null;
  const year = Number(m[1]) as 1 | 2 | 3;
  const stream = m[2] as Stream;
  return YEAR_STREAMS[year].includes(stream) ? { year, stream } : null;
}

/** السنة دون الشعبة («2AS-SE» ⇐ «2AS»)؛ المستويات الأخرى كما هي. المكتبة والرزنامة تعملان بالسنة. */
export const baseLevel = (level: string): string => level.replace(/^([1-3]AS)-[A-Z]+$/, "$1");

/** مواد كل شعبة (المواد الاختيارية — الفنون — لا تُفرض؛ الأمازيغية والبدنية لكل الشعب). */
const COMMON = ["ar", "fr", "en", "math", "islamic", "histgeo", "tamazight", "pe"] as const;
const SUBJECTS: Record<1 | 2 | 3, Partial<Record<Stream, readonly string[]>>> = {
  1: {
    ST: [...COMMON, "physics", "science", "engineering", "informatics", "art", "music"],
    L: [...COMMON, "physics", "science", "informatics", "art", "music"],
  },
  2: {
    SE: [...COMMON, "physics", "science"],
    M: [...COMMON, "physics", "science"],
    TM: [...COMMON, "physics", "engineering"],
    GE: [...COMMON, "economics", "accounting", "law"],
    LP: [...COMMON, "philosophy", "physics", "science"],
    LE: [...COMMON, "philosophy", "german", "spanish", "italian", "physics", "science"],
  },
  3: {
    SE: [...COMMON, "physics", "science", "philosophy"],
    M: [...COMMON, "physics", "science", "philosophy"],
    TM: [...COMMON, "physics", "engineering", "philosophy"],
    GE: [...COMMON, "economics", "accounting", "law", "philosophy"],
    LP: [...COMMON, "philosophy"],
    LE: [...COMMON, "philosophy", "german", "spanish", "italian"],
  },
};

export function streamSubjects(year: 1 | 2 | 3, stream: Stream): readonly string[] {
  return SUBJECTS[year][stream] ?? [];
}

/** الشعب التي تتشارك البرنامج نفسه في مادة (السنتان الثانية والثالثة): أول شعبة في المجموعة صاحبة المنهاج. */
const SCIENTIFIC: Stream[] = ["SE", "M", "TM", "GE"];
const LITERARY: Stream[] = ["LP", "LE"];
const PROGRAMS: Record<string, Stream[][]> = {
  ar: [SCIENTIFIC, ["LP"], ["LE"]],
  fr: [SCIENTIFIC, ["LP"], ["LE"]],
  en: [SCIENTIFIC, ["LP"], ["LE"]],
  math: [["SE"], ["M", "TM"], ["GE"], LITERARY],
  physics: [["SE", "M", "TM"], LITERARY],
  science: [["SE"], ["M"], LITERARY],
  islamic: [[...SCIENTIFIC, ...LITERARY]],
  histgeo: [SCIENTIFIC, LITERARY],
  philosophy: [SCIENTIFIC, ["LP"], ["LE"]],
  tamazight: [[...SCIENTIFIC, ...LITERARY]],
  pe: [[...SCIENTIFIC, ...LITERARY]],
};

/** مستوى المنهاج الذي تدرسه شعبة في مادة: «2AS-TM» رياضيات ⇐ «2AS-M». المستويات غير الثانوية كما هي. */
export function programLevel(level: string, subject: string): string {
  const s = parseSecondary(level);
  if (!s || s.year === 1) return level;
  const group = PROGRAMS[subject]?.find((g) => g.includes(s.stream));
  return group ? `${s.year}AS-${group[0]}` : level;
}

/** مستويات الثانوي للتصنيف: اسم السنة والشعبة. */
export function secondaryLevels() {
  const ord = { 1: ["الأولى", "1re", "1st"], 2: ["الثانية", "2e", "2nd"], 3: ["الثالثة", "3e", "3rd"] } as const;
  return ([1, 2, 3] as const).flatMap((year) =>
    YEAR_STREAMS[year].map((stream) => {
      const st = STREAMS[stream];
      const [ar, fr, en] = ord[year];
      return {
        id: `${year}AS-${stream}`,
        order: year,
        label: { ar: `السنة ${ar} ثانوي — ${st.ar}`, fr: `${fr} année secondaire — ${st.fr}`, en: `${en} Year Secondary — ${st.en}` },
        short: { ar: `${year} ث ${st.short}`, fr: `${year}AS ${stream}`, en: `${year}AS ${stream}` },
      };
    }),
  );
}
