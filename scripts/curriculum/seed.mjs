/**
 * نشر مذكرات جاهزة (content/curriculum/<id>.json) في Firestore بطبقاتها الثلاث:
 *   curriculum/<id>        — فهرس العناوين (يراه كل مسجَّل)
 *   lessonSummaries/<id>_NNN — الميدان، النشاط، الموضوع، الوسائل، الأهداف (التجربة والمشتركون)
 *   lessonBodies/<id>_NNN  — سير الحصة (المشتركون، والنماذج المختارة للتجربة)
 *
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/curriculum/seed.mjs 1AP_ar
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/curriculum/seed.mjs 1AP_ar
 *
 * --pdf=<الوثيقة الأصلية>: صفحات الحصص التي لا نص سليمًا لها تُنشر صورًا (lessonBodies/<id>_pgNN)
 * بنفس حماية السير المكتوب — تتطلب pdftoppm.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { putDoc } from "../lib/firestore.mjs";

const id = process.argv[2];
const pdf = process.argv.find((a) => a.startsWith("--pdf="))?.slice(6) ?? null;
/** وثائق إضافية: --pdf-b=<ملف> تقابل صفحات «b:N» في البيانات */
const extraPdf = Object.fromEntries(process.argv.filter((a) => /^--pdf-[a-z]=/.test(a)).map((a) => [a[6], a.slice(8)]));
const pdfOf = (key) => (key === "main" ? pdf : extraPdf[key]);
/** صفحة: رقم في الوثيقة الأصلية، أو «b:N» في وثيقة إضافية */
const parsePage = (p) => (typeof p === "number" ? { key: "main", n: p } : { key: p.split(":")[0], n: Number(p.split(":")[1]) });
if (!/^(?:PRE|[1-5]AP)_[a-z]+$/.test(id ?? "")) {
  console.error("usage: seed.mjs <level_subject>, e.g. 1AP_ar or PRE_math");
  process.exit(1);
}
const data = JSON.parse(readFileSync(new URL(`../../content/curriculum/${id}.json`, import.meta.url), "utf8"));
const lessonId = (l) => `${id}_${String(l.order).padStart(3, "0")}`;

/** صفحات الوثيقة لكل حصة: محددة في البيانات، أو (للنص المشوّه) من صفحتها حتى الحصة التالية. */
function pagesOf(lessons) {
  const byOrder = [...lessons].sort((a, b) => a.order - b.order);
  return new Map(
    byOrder.map((l, i) => {
      if (Array.isArray(l.pages)) return [l.order, l.pages];
      if (l.bodyQuality !== "garbled" || !l.page) return [l.order, []];
      const next = byOrder.slice(i + 1).find((x) => x.page > l.page)?.page ?? l.page + 1;
      const out = [];
      for (let p = l.page; p < next && out.length < 4; p++) out.push(p);
      return [l.order, out];
    }),
  );
}

/** نماذج كاملة للتجربة: «بعض المحتوى الكامل» — أيام من الفترة التمهيدية وحصة من كل نوع رئيسي في مقطع واحد. */
function pickSamples(lessons) {
  const picked = new Set();
  // نماذج محددة صراحةً في البيانات
  if (lessons.some((l) => l.sample === true)) return new Set(lessons.filter((l) => l.sample).map((l) => l.order));
  lessons.filter((l) => l.segment === 1 && l.unit <= 3 && l.body).forEach((l) => picked.add(l.order));
  const seg = lessons.find((l) => l.segment === 3 && l.body) ? 3 : lessons.find((l) => l.body)?.segment;
  const seen = new Set();
  for (const l of lessons) {
    if (l.segment !== seg || !l.body || seen.has(l.domain) || picked.size >= 8) continue;
    seen.add(l.domain);
    picked.add(l.order);
  }
  return picked;
}

if (!pdf && data.lessons.some((l) => (Array.isArray(l.pages) && l.pages.length) || l.bodyQuality === "garbled")) {
  console.error("هذه المذكرات تحتاج صور صفحات: مرّر --pdf=<الوثيقة الأصلية>");
  process.exit(1);
}
const pageMap = pdf ? pagesOf(data.lessons) : new Map();
const pageId = (p) => {
  const { key, n } = parsePage(p);
  return `${id}_${key === "main" ? "pg" : key}${String(n).padStart(3, "0")}`;
};
const hasBody = (l) => !!l.body || (pageMap.get(l.order)?.length ?? 0) > 0;
const samples = pickSamples(data.lessons.map((l) => ({ ...l, body: hasBody(l) ? l.body || "pages" : "" })));
const now = Date.now();
const source = data.source;

await putDoc(`curriculum/${id}`, {
  level: data.level,
  subject: data.subject,
  title: data.title,
  source,
  ...(data.weekMode ? { weekMode: data.weekMode } : {}),
  segments: Object.entries(data.segments).map(([n, title]) => ({ n: Number(n), title })),
  entries: data.lessons.map((l) => ({
    id: lessonId(l),
    o: l.order,
    s: l.segment,
    k: l.unitKind,
    u: l.unit,
    a: l.activity,
    ...(l.activity !== l.session && !/الحص/.test(l.activity) && l.session && l.session !== l.activity && l.unitKind === "week" && !l.page ? { ss: l.session } : {}),
    d: l.domain,
    t: l.topic,
    b: hasBody(l),
    sm: samples.has(l.order),
  })),
  updatedAt: now,
});
console.log(`✓ curriculum/${id} (${data.lessons.length} حصة، ${samples.size} نماذج للتجربة)`);

// صور الصفحات: الصفحة نموذج للتجربة إن كانت تخص حصة نموذجية
const blank = new Set();
if (pdf) {
  const pageSample = new Map();
  for (const l of data.lessons) for (const p of pageMap.get(l.order) ?? []) pageSample.set(p, (pageSample.get(p) ?? false) || samples.has(l.order));
  const dir = mkdtempSync(join(tmpdir(), "pages-"));
  let k = 0;
  for (const [page, sample] of [...pageSample].sort((a, b) => String(a[0]).localeCompare(String(b[0]), "en", { numeric: true }))) {
    const { key, n: pn } = parsePage(page);
    const file = pdfOf(key);
    if (!file) throw new Error(`مرّر --pdf-${key}=<الملف> لصفحة ${page}`);
    const base = join(dir, `p${key}${pn}`);
    execFileSync("pdftoppm", ["-f", String(pn), "-l", String(pn), "-r", "110", "-jpeg", "-jpegopt", "quality=60", "-singlefile", file, base]);
    const bytes = readFileSync(`${base}.jpg`);
    // صفحة بيضاء (فاصل في الوثيقة): لا تُنشر وتُحذف من قوائم الحصص
    if (bytes.length < 12_000) {
      blank.add(page);
      continue;
    }
    const img = bytes.toString("base64");
    if (img.length > 900_000) throw new Error(`page ${page} too large`);
    await putDoc(`lessonBodies/${pageId(page)}`, { curriculumId: id, sample, page: pn, ...(key === "main" ? {} : { doc: key }), img, updatedAt: now });
    if (++k % 20 === 0) console.log(`  … ${k} صفحة`);
  }
  console.log(`✓ ${k} صفحة مصوّرة`);
}
for (const [order, list] of pageMap) pageMap.set(order, list.filter((p) => !blank.has(p)));

let n = 0;
for (const l of data.lessons) {
  const sample = samples.has(l.order);
  await putDoc(`lessonSummaries/${lessonId(l)}`, {
    curriculumId: id,
    level: data.level,
    subject: data.subject,
    order: l.order,
    segment: l.segment,
    segmentTitle: l.segmentTitle,
    unitKind: l.unitKind,
    unit: l.unit,
    session: l.session,
    activity: l.activity,
    domain: l.domain,
    topic: l.topic,
    materials: l.materials,
    objectives: l.objectives,
    ...(l.objectiveParts ? { objectiveParts: l.objectiveParts.map((items) => ({ items })) } : {}),
    hasBody: hasBody(l),
    sample,
    source,
    updatedAt: now,
  });
  if (hasBody(l)) {
    const pages = (pageMap.get(l.order) ?? []).map(pageId);
    await putDoc(`lessonBodies/${lessonId(l)}`, { curriculumId: id, sample, body: l.body ?? "", pages, quality: l.bodyQuality ?? "pages", source, updatedAt: now });
  }
  if (++n % 50 === 0) console.log(`  … ${n}`);
}
console.log(`✓ ${n} ملخّص`);

