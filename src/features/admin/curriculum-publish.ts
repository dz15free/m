"use client";

import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import { authedFetch } from "@/lib/firebase/api";
import { browserDownload } from "@/features/library/repo";
import { memoFigures, withImages, type Memo } from "@/features/lessons/memo";
import { memoFileRev } from "@/features/lessons/memo-rev";

/* نشر المذكرات من متصفح الأدمن (مكافئ scripts/curriculum/seed.mjs، دون حساب خدمة): قواعد Firestore تسمح للمحرّر
   والأدمن بكتابة curriculum وlessonSummaries وlessonBodies. صفحات المصادر الإضافية («sources» غير main) تُحمَّل
   من مجلد المكتبة على Drive وتُرسم صورًا هنا بـ pdf.js؛ صفحات المصدر الرئيسي منشورة من قبل فلا تُعاد. */

type Lesson = {
  order: number;
  unitKind: "week" | "day";
  unit: number;
  segment: number;
  segmentTitle: string;
  activity: string;
  session?: string;
  domain: string;
  topic: string;
  materials?: string;
  objectives?: string[];
  objectiveParts?: string[][];
  body?: string;
  page?: number;
  pages?: (number | string)[];
  /** نموذج مجاني للتجربة (يُعتمد عند أول نشر فقط) */
  sample?: boolean;
};
/** pdf/images: ملفات Drive. web: روابط مصدر مذكرات مُنسّقة مضمّنة (للتوثيق؛ لا يُحمَّل). */
type SourceSpec = { pdf?: string[]; images?: string[]; web?: string[] };
export type CurriculumFile = {
  id: string;
  level: string;
  subject: string;
  title: string;
  source: { ar: string; fr: string };
  weekMode?: "absolute";
  segments: Record<string, string>;
  lessons: Lesson[];
  sources?: Record<string, SourceSpec>;
};

export type Progress = { step: "load" | "pages" | "memos" | "summaries" | "index"; done: number; total: number };

const db = () => getFirebase().db;
const pad = (n: number) => String(n).padStart(3, "0");
const lessonId = (id: string, l: Lesson) => `${id}_${pad(l.order)}`;
const parsePage = (p: number | string) => (typeof p === "number" ? { key: "main", n: p } : { key: p.split(":")[0]!, n: Number(p.split(":")[1]) });
const pageId = (id: string, p: number | string) => {
  const { key, n } = parsePage(p);
  return `${id}_${key === "main" ? "pg" : key}${pad(n)}`;
};

/** بصمة المحتوى: تُحفظ في فهرس المنهاج لمعرفة ما إذا كانت النسخة المنشورة هي هذه (ومعها بصمة المذكرات المُنسّقة إن وُجدت). */
export function contentRev(c: CurriculumFile, memoRev?: string | null): string {
  const s = JSON.stringify([c.segments, c.lessons, c.sources ?? null, ...(memoRev ? [memoRev] : [])]);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16);
}

export async function publishedRev(id: string): Promise<string | null> {
  const snap = await getDoc(doc(db(), "curriculum", id)).catch(() => null);
  return snap?.exists() ? ((snap.data().rev as string | undefined) ?? "") : null;
}

/** ملف من مجلد المكتبة عبر الخادم (Drive لا يسمح للمتصفح بتحميل ملفاته مباشرة: CORS)، وإلا مباشرة. */
async function driveBlob(id: string): Promise<Blob> {
  const res = await authedFetch(`/api/admin/drive-file?id=${encodeURIComponent(id)}`);
  if (res.ok) return res.blob();
  const reason = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "";
  try {
    return await browserDownload(id);
  } catch {
    throw new Error(`Drive ${id}: ${res.status} ${reason}`.trim());
  }
}

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

async function canvasJpeg(canvas: HTMLCanvasElement, qualities = [0.6, 0.45, 0.35]): Promise<{ img: string; bytes: number }> {
  for (const q of qualities) {
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", q));
    const img = await toBase64(blob);
    if (img.length <= 900_000) return { img, bytes: blob.size };
  }
  throw new Error("page too large");
}

type Renderer = (n: number, hiRes?: boolean) => Promise<HTMLCanvasElement>;

/** شكل مقتطع من صفحة (نِسَب من عرضها وطولها)، بعرض 900px على الأكثر. */
async function cropJpeg(page: HTMLCanvasElement, [x, y, w, h]: [number, number, number, number]): Promise<string> {
  const sx = Math.round(x * page.width);
  const sy = Math.round(y * page.height);
  const sw = Math.max(1, Math.round(w * page.width));
  const sh = Math.max(1, Math.round(h * page.height));
  const scale = Math.min(1, 900 / sw);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext("2d")!.drawImage(page, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return (await canvasJpeg(canvas, [0.8, 0.65, 0.5])).img;
}

/** وثيقة مصدر: صفحاتها مرقّمة تباعًا عبر ملفاتها (كما يدمجها pdfunite في seed.mjs). */
async function openSource(spec: SourceSpec): Promise<Renderer> {
  if (spec.web) throw new Error("web source: every lesson needs its re-typeset memo (content/memos)");
  if (spec.images) {
    const ids = spec.images;
    return async (n) => {
      const bitmap = await createImageBitmap(await driveBlob(ids[n - 1]!));
      const scale = Math.min(1, 1000 / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas;
    };
  }
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `/vendor/pdf/pdf.worker.min.mjs?v=${pdfjs.version}-actualtext1`;
  const docs: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>[] = [];
  for (const id of spec.pdf ?? []) docs.push(await pdfjs.getDocument({ data: await (await driveBlob(id)).arrayBuffer() }).promise);
  return async (n, hiRes = false) => {
    let k = n;
    for (const d of docs) {
      if (k <= d.numPages) {
        const page = await d.getPage(k);
        const viewport = page.getViewport({ scale: hiRes ? 170 / 72 : 110 / 72 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        return canvas;
      }
      k -= d.numPages;
    }
    throw new Error(`page ${n} out of range`);
  };
}

/** المذكرات المُنسّقة مفتاحها أول صفحة للحصة في مصدرها («b:9»). */
const memoKey = (l: Lesson) => String(l.pages?.[0] ?? "");

export async function publishCurriculum(c: CurriculumFile, onProgress: (p: Progress) => void, memos?: Record<string, Memo>): Promise<void> {
  const id = c.id;
  const now = Date.now();
  // النماذج المجانية للتجربة تبقى كما نُشرت (لا نعيد كتابة صفحات المصدر الرئيسي)
  const existing = await getDoc(doc(db(), "curriculum", id));
  const prevSample = new Map<string, boolean>(((existing.data()?.entries as { id: string; sm: boolean }[] | undefined) ?? []).map((e) => [e.id, e.sm]));
  // منهاج جديد: النماذج المجانية من الملف («sample»)
  const sampleOf = (l: Lesson) => prevSample.get(lessonId(id, l)) ?? l.sample ?? false;

  const memoOf = (l: Lesson) => memos?.[memoKey(l)];

  // 1) صفحات المصادر الإضافية: صورًا للحصص بلا مذكرة مُنسّقة، وللاقتطاع منها أشكالَ المذكرات المُنسّقة
  const extra = new Map<string, Set<number>>();
  const add = (p: number | string) => {
    const { key, n } = parsePage(p);
    if (key !== "main") extra.set(key, (extra.get(key) ?? new Set()).add(n));
  };
  for (const l of c.lessons) if (!memoOf(l)) (l.pages ?? []).forEach(add);
  const figPages = new Set<string>();
  for (const l of c.lessons) for (const f of memoOf(l) ? memoFigures(memoOf(l)!) : []) figPages.add(f.ref);
  figPages.forEach(add);
  const asImage = new Set(c.lessons.filter((l) => !memoOf(l)).flatMap((l) => (l.pages ?? []).map(String)));
  const figures = new Map<string, string>(); // "ref x y w h" ← JPEG
  const figKey = (ref: string, b: number[]) => `${ref} ${b.join(" ")}`;
  const total = [...extra.values()].reduce((n, s) => n + s.size, 0);
  const blank = new Set<string>();
  let done = 0;
  for (const [key, pages] of extra) {
    const spec = c.sources?.[key];
    if (!spec) throw new Error(`${id}: no source for "${key}"`);
    onProgress({ step: "load", done, total });
    const render = await openSource(spec);
    for (const n of [...pages].sort((a, b) => a - b)) {
      const ref = `${key}:${n}`;
      if (figPages.has(ref)) {
        const canvas = await render(n, true);
        for (const l of c.lessons)
          for (const f of memoOf(l) ? memoFigures(memoOf(l)!) : [])
            if (f.ref === ref && !figures.has(figKey(ref, f.box))) figures.set(figKey(ref, f.box), await cropJpeg(canvas, f.box));
      }
      if (asImage.has(ref)) {
        const { img, bytes } = await canvasJpeg(await render(n));
        // صفحة بيضاء (فاصل): لا تُنشر وتُحذف من قوائم الحصص — نفس عتبة seed.mjs
        if (bytes < 12_000) blank.add(ref);
        else {
          const sample = c.lessons.some((l) => (l.pages ?? []).includes(ref) && sampleOf(l));
          await setDoc(doc(db(), "lessonBodies", pageId(id, ref)), { curriculumId: id, sample, page: n, doc: key, img, updatedAt: now });
        }
      }
      onProgress({ step: "pages", done: ++done, total });
    }
  }

  // 2) المذكرات المُنسّقة (وثيقة لكل حصة، بأشكالها)
  const withMemo = c.lessons.filter((l) => memoOf(l));
  for (const [i, l] of withMemo.entries()) {
    const memo = memoOf(l)!;
    const imgs = memoFigures(memo).map((f) => figures.get(figKey(f.ref, f.box)) ?? "");
    // أشكال مقتطعة الآن من Drive، أو مضمّنة في الملف من قبل (مصادر الويب)
    const published = imgs.length ? withImages(memo, imgs) : memo;
    await setDoc(doc(db(), "lessonBodies", lessonId(id, l)), { curriculumId: id, sample: sampleOf(l), body: "", memo: published, quality: "memo", source: c.source, updatedAt: now });
    onProgress({ step: "memos", done: i + 1, total: withMemo.length });
  }

  // 3) الملخّصات، وسير الحصص ذات الصفحات الجديدة (سير حصص المصدر الرئيسي منشور من قبل)
  const hasBody = (l: Lesson) => !!memoOf(l) || !!l.body || (l.pages ?? []).some((p) => !blank.has(String(p)));
  const lessons = [...c.lessons];
  for (let i = 0; i < lessons.length; i += 200) {
    const batch = writeBatch(db());
    for (const l of lessons.slice(i, i + 200)) {
      const sample = sampleOf(l);
      batch.set(doc(db(), "lessonSummaries", lessonId(id, l)), {
        curriculumId: id,
        level: c.level,
        subject: c.subject,
        order: l.order,
        segment: l.segment,
        segmentTitle: l.segmentTitle,
        unitKind: l.unitKind,
        unit: l.unit,
        session: l.session ?? "",
        activity: l.activity,
        domain: l.domain,
        topic: l.topic,
        materials: l.materials ?? "",
        objectives: l.objectives ?? [],
        ...(l.objectiveParts ? { objectiveParts: l.objectiveParts.map((items) => ({ items })) } : {}),
        hasBody: hasBody(l),
        sample,
        source: c.source,
        updatedAt: now,
      });
      // صفحات المصدر الرئيسي (منشورة من قبل) تبقى في أول السير، والمذكرات الملحقة بعدها
      const pages = (l.pages ?? []).filter((p) => !blank.has(String(p)));
      if (!memoOf(l) && pages.some((p) => parsePage(p).key !== "main")) {
        batch.set(doc(db(), "lessonBodies", lessonId(id, l)), { curriculumId: id, sample, body: l.body ?? "", pages: pages.map((p) => pageId(id, p)), quality: "pages", source: c.source, updatedAt: now });
      }
    }
    await batch.commit();
    onProgress({ step: "summaries", done: Math.min(i + 200, lessons.length), total: lessons.length });
  }

  // 4) الفهرس (آخر خطوة: لا يُعرض جديد قبل أن تجهز صفحاته)
  await setDoc(doc(db(), "curriculum", id), {
    level: c.level,
    subject: c.subject,
    title: c.title,
    source: c.source,
    ...(c.weekMode ? { weekMode: c.weekMode } : {}),
    segments: Object.entries(c.segments).map(([n, title]) => ({ n: Number(n), title })),
    entries: c.lessons.map((l) => ({
      id: lessonId(id, l),
      o: l.order,
      s: l.segment,
      k: l.unitKind,
      u: l.unit,
      a: l.activity,
      ...(l.activity !== l.session && !/الحص/.test(l.activity) && l.session && l.session !== l.activity && l.unitKind === "week" && !l.page ? { ss: l.session } : {}),
      d: l.domain,
      t: l.topic,
      b: hasBody(l),
      sm: sampleOf(l),
    })),
    rev: contentRev(c, memos ? memoFileRev(memos) : null),
    updatedAt: now,
  });
  onProgress({ step: "index", done: 1, total: 1 });
}
