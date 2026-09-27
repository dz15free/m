/**
 * نشر مذكرات جاهزة (content/curriculum/<id>.json) في Firestore بطبقاتها الثلاث:
 *   curriculum/<id>        — فهرس العناوين (يراه كل مسجَّل)
 *   lessonSummaries/<id>_NNN — الميدان، النشاط، الموضوع، الوسائل، الأهداف (التجربة والمشتركون)
 *   lessonBodies/<id>_NNN  — سير الحصة (المشتركون، والنماذج المختارة للتجربة)
 *
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/curriculum/seed.mjs 1AP_ar
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/curriculum/seed.mjs 1AP_ar
 */
import { readFileSync } from "node:fs";
import { putDoc } from "../lib/firestore.mjs";

const id = process.argv[2];
if (!/^[1-5]AP_[a-z]+$/.test(id ?? "")) {
  console.error("usage: seed.mjs <level_subject>, e.g. 1AP_ar");
  process.exit(1);
}
const data = JSON.parse(readFileSync(new URL(`../../content/curriculum/${id}.json`, import.meta.url), "utf8"));
const lessonId = (l) => `${id}_${String(l.order).padStart(3, "0")}`;

/** نماذج كاملة للتجربة: «بعض المحتوى الكامل» — أيام من الفترة التمهيدية وحصة من كل نوع رئيسي في مقطع واحد. */
function pickSamples(lessons) {
  const picked = new Set();
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

const samples = pickSamples(data.lessons);
const now = Date.now();
const source = data.source;

await putDoc(`curriculum/${id}`, {
  level: data.level,
  subject: data.subject,
  title: data.title,
  source,
  segments: Object.entries(data.segments).map(([n, title]) => ({ n: Number(n), title })),
  entries: data.lessons.map((l) => ({
    id: lessonId(l),
    o: l.order,
    s: l.segment,
    k: l.unitKind,
    u: l.unit,
    a: l.activity,
    d: l.domain,
    t: l.topic,
    b: !!l.body,
    sm: samples.has(l.order),
  })),
  updatedAt: now,
});
console.log(`✓ curriculum/${id} (${data.lessons.length} حصة، ${samples.size} نماذج للتجربة)`);

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
    hasBody: !!l.body,
    sample,
    source,
    updatedAt: now,
  });
  if (l.body) {
    await putDoc(`lessonBodies/${lessonId(l)}`, { curriculumId: id, sample, body: l.body, quality: l.bodyQuality, source, updatedAt: now });
  }
  if (++n % 50 === 0) console.log(`  … ${n}`);
}
console.log(`✓ ${n} ملخّص`);
