/**
 * يجمع تفريغ مذكرات الثانوي (وحدة في كل مجلد) في مواصفة scripts/curriculum/secondary/<id>.json ومذكرات content/memos/<id>.json.
 *
 * المدخل: <work>/u<N>/files.json ({ files: [{ id, pages, local }] }) و<work>/u<N>/result.json
 *   ({ segmentTitle, lessons: [{ domain, topic, objectives, kind, file, pages, hours, memo }] })، والأشكال في المذكرات
 *   «[[fig F:P x y w h]]» (F رقم الملف داخل الوحدة).
 * المخرج: ملفات المصدر المستعملة فقط موصولة بترتيب الوحدات («b»)، ومفتاح كل مذكرة أول صفحاتها «b:N»، والأشكال «[[fig b:N …]]».
 * ثم: node scripts/curriculum/build-middle.mjs <id> و memo-embed.mjs <id> --files <ملفات محلية بنفس الترتيب> و memo-index.mjs
 *
 *   node scripts/curriculum/secondary-merge.mjs <id> <work> [--hours 4] [--notes "…"]
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const [, , id, work, ...rest] = process.argv;
if (!id || !work) throw new Error("usage: secondary-merge.mjs <id> <work> [--hours n] [--notes text]");
const opt = (k) => (rest.includes(k) ? rest[rest.indexOf(k) + 1] : undefined);
const [level, subject] = id.split("_");

const units = readdirSync(work)
  .filter((d) => /^u\d+$/.test(d))
  .map((d) => Number(d.slice(1)))
  .sort((a, b) => a - b);

const files = []; // { id, pages, local }
const fileIndex = new Map(); // `${unit}:${F}` ⇐ رقمه في المواصفة
const segments = {};
const lessons = [];
const memos = {};
const pending = []; // [lesson, memo, unit]

for (const u of units) {
  const dir = `${work}/u${u}`;
  const meta = JSON.parse(readFileSync(`${dir}/files.json`, "utf8"));
  const res = JSON.parse(readFileSync(`${dir}/result.json`, "utf8"));
  segments[String(u)] = res.segmentTitle;
  const use = (F) => {
    const key = `${u}:${F}`;
    if (!fileIndex.has(key)) {
      const f = meta.files[F];
      if (!f) throw new Error(`unit ${u}: no file ${F}`);
      fileIndex.set(key, files.length);
      files.push({ id: f.id, pages: f.pages, local: f.local });
    }
    return fileIndex.get(key);
  };
  for (const l of res.lessons) {
    const file = use(l.file);
    // ملفات الأشكال من ملفات أخرى في الوحدة
    for (const m of JSON.stringify(l.memo).matchAll(/\[\[fig (\d+):(\d+) /g)) use(Number(m[1]));
    const lesson = { segment: u, domain: l.domain, topic: l.topic, objectives: (l.objectives ?? []).slice(0, 3), kind: l.kind === "lab" ? "lesson" : l.kind, file, pages: l.pages, hours: l.hours ?? null, week: null };
    lessons.push(lesson);
    pending.push([lesson, l.memo, u]);
  }
}

const offsets = [];
files.reduce((acc, f, i) => ((offsets[i] = acc), acc + f.pages), 0);
const ref = (u, F, P) => `b:${offsets[fileIndex.get(`${u}:${F}`)] + Number(P)}`;
for (const [lesson, memo, u] of pending) {
  // مثل memoKeys: حصتان تبدآن من الصفحة نفسها ⇐ «b:N~2»
  const first = `b:${offsets[lesson.file] + lesson.pages[0]}`;
  let key = first;
  for (let n = 2; memos[key]; n++) key = `${first}~${n}`;
  memos[key] = JSON.parse(JSON.stringify(memo).replace(/\[\[fig (\d+):(\d+) /g, (_, F, P) => `[[fig ${ref(u, F, P)} `));
}

const spec = {
  id, level, subject, language: "ar", kind: "memos", complete: true, embedded: true,
  ...(opt("--hours") ? { hoursPerWeek: Number(opt("--hours")) } : {}),
  files: files.map((f) => f.id),
  filePages: files.map((f) => f.pages),
  segments,
  lessons,
  ...(opt("--notes") ? { notes: opt("--notes") } : {}),
};
writeFileSync(new URL(`./secondary/${id}.json`, import.meta.url), JSON.stringify(spec, null, 1) + "\n");
writeFileSync(new URL(`../../content/memos/${id}.json`, import.meta.url), JSON.stringify(memos, null, 1) + "\n");
writeFileSync(`${work}/local-files.txt`, files.map((f) => f.local).join(","));
console.log(`${id}: ${lessons.length} حصة، ${files.length} ملف، ${Object.keys(memos).length} مذكرة — الملفات المحلية في ${work}/local-files.txt`);
