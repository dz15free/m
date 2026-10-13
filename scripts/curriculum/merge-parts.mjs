/**
 * يجمع أجزاء مادة من ملفات الويب (scripts/curriculum/middle/parts/<id>.<k>.json وcontent/memos/parts/<id>.<k>.json)
 * في مواصفة واحدة scripts/curriculum/middle/<id>.json وملف مذكرات content/memos/<id>.json، ثم:
 *   node scripts/curriculum/build-middle.mjs <id> && node scripts/curriculum/memo-embed.mjs <id> --files … && node scripts/curriculum/memo-index.mjs
 *
 *   node scripts/curriculum/merge-parts.mjs <id> --files <a.pdf,b.pdf> --web <url1,url2> [--language ar|fr|en] [--complete false] [--notes "…"]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const [, , id, ...rest] = process.argv;
const opt = (k) => (rest.includes(k) ? rest[rest.indexOf(k) + 1] : undefined);
const files = opt("--files")?.split(",") ?? [];
const web = opt("--web")?.split(",") ?? [];
if (!id || !files.length || !web.length) throw new Error("usage: merge-parts.mjs <id> --files … --web …");
const SPEC = new URL("./middle/parts/", import.meta.url);
const MEMO = new URL("../../content/memos/parts/", import.meta.url);

const parts = readdirSync(SPEC)
  .filter((f) => f.startsWith(`${id}.`) && f.endsWith(".json"))
  .sort((a, b) => Number(a.split(".")[1]) - Number(b.split(".")[1]));
if (!parts.length) throw new Error(`no parts for ${id}`);
const filePages = files.map((f) => Number(execFileSync("pdfinfo", [f]).toString().match(/Pages:\s+(\d+)/)[1]));
const offsets = filePages.map((_, i) => filePages.slice(0, i).reduce((a, b) => a + b, 0));

const segments = {};
const lessons = [];
const memos = {};
for (const f of parts) {
  const spec = JSON.parse(readFileSync(new URL(f, SPEC), "utf8"));
  Object.assign(segments, spec.segments);
  lessons.push(...spec.lessons);
  Object.assign(memos, JSON.parse(readFileSync(new URL(f, MEMO), "utf8")));
}
// كل حصة لها مذكرتها، ولا مذكرة بلا حصة
const keys = new Set(lessons.map((l) => `w:${offsets[l.file ?? 0] + l.pages[0]}`));
const missing = [...keys].filter((k) => !memos[k]);
const orphan = Object.keys(memos).filter((k) => !keys.has(k));
if (missing.length || orphan.length) throw new Error(`${id}: lessons without memo ${missing.join(" ")} · memos without lesson ${orphan.join(" ")}`);

const [level, subject] = id.split("_");
const old = (() => {
  try {
    return JSON.parse(readFileSync(new URL(`./middle/${id}.json`, import.meta.url), "utf8"));
  } catch {
    return {};
  }
})();
const spec = {
  id,
  level,
  subject,
  language: opt("--language") ?? old.language ?? "ar",
  kind: "memos",
  web,
  files: [],
  filePages,
  ...(opt("--complete") === "false" ? { complete: false } : {}),
  segments: Object.fromEntries(Object.entries(segments).sort(([a], [b]) => Number(a) - Number(b))),
  lessons,
  notes: opt("--notes") ?? "",
};
writeFileSync(new URL(`./middle/${id}.json`, import.meta.url), JSON.stringify(spec, null, 1) + "\n");
writeFileSync(new URL(`../../content/memos/${id}.json`, import.meta.url), JSON.stringify(memos, null, 1) + "\n");
console.log(`${id}: ${parts.length} أجزاء، ${lessons.length} حصة، ${Object.keys(segments).length} مقطع`);
