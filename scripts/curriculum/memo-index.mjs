/**
 * فهرس المذكرات المُنسّقة: يكتب src/features/admin/curriculum-memos.gen.ts — محمّل مؤجّل لكل content/memos/<id>.json
 * وبصمته (تدخل في بصمة المنهاج فيظهر «نشر» عند تغيّر المذكرات). يُعاد تشغيله بعد كل تعديل في content/memos
 * (اختبار curriculum-memos.test.ts يتأكد من تطابقه).
 *
 *   node scripts/curriculum/memo-index.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { memoFileRev } from "../../src/features/lessons/memo-rev.ts";

const DIR = new URL("../../content/memos/", import.meta.url);
const OUT = new URL("../../src/features/admin/curriculum-memos.gen.ts", import.meta.url);

const ids = readdirSync(DIR).filter((f) => /^[\w-]+\.json$/.test(f)).map((f) => f.slice(0, -5)).sort();
const lines = ids.map((id) => {
  const memos = JSON.parse(readFileSync(new URL(`${id}.json`, DIR), "utf8"));
  return `  ${JSON.stringify(id)}: { rev: ${JSON.stringify(memoFileRev(memos))}, count: ${Object.keys(memos).length}, load: () => import("../../../content/memos/${id}.json") },`;
});
writeFileSync(
  OUT,
  `// مُولَّد بـ scripts/curriculum/memo-index.mjs — لا تعدّله يدويًا.
import type { Memo } from "@/features/lessons/memo";

type Entry = { rev: string; count: number; load: () => Promise<{ default: unknown }> };

export const MEMO_FILES: Record<string, Entry> = {
${lines.join("\n")}
};

export type MemoFile = Record<string, Memo>;
`,
);
console.log(`${ids.length} ملف مذكرات: ${ids.join("، ")}`);
