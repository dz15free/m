/* مصادر المذكرات على Google Drive (ملفات منشورة للعموم في مجلد المكتبة).
   يُحمَّل الملف بمعرّفه مرة واحدة إلى مجلد مؤقت، فلا يحتاج من ينشر المذكرات إلى تنزيل أي شيء يدويًا.
   «sources» في ملف المنهاج: { "main": { "pdf": [id] }, "b": { "pdf": [id, id, …] }, "c": { "images": [id, …] } }
   — عدة PDF لمفتاح واحد تُدمج بالترتيب في وثيقة واحدة (pdfunite)، وصفحاتها تُرقَّم تباعًا. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CACHE = join(tmpdir(), "prof-baczone-drive");

/** تنزيل ملف Drive عام بمعرّفه (مع ذاكرة محلية). */
export async function driveFile(id) {
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) throw new Error(`bad drive id: ${id}`);
  mkdirSync(CACHE, { recursive: true });
  const out = join(CACHE, id);
  if (existsSync(out) && statSync(out).size > 0) return out;
  const res = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`);
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || type.startsWith("text/html")) throw new Error(`drive ${id}: ${res.status} ${type} (هل الملف مشارك للعموم؟)`);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  return out;
}

export const pdfPages = (file) => Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [file]).toString())?.[1] ?? 0);

/** وثيقة PDF واحدة من قائمة ملفات (تُدمج إن تعددت). */
export async function drivePdf(ids) {
  const files = [];
  for (const id of ids) files.push(await driveFile(id));
  if (files.length === 1) return files[0];
  const out = join(CACHE, `merged-${ids.join("_").slice(0, 120)}.pdf`);
  if (!existsSync(out)) execFileSync("pdfunite", [...files, out]);
  return out;
}

/** وثائق الصفحات: ما يُمرَّر في سطر الأوامر أولًا، وإلا مصادر Drive المعلنة في ملف المنهاج. */
export async function resolveDocs(sources = {}, cli = {}) {
  const docs = {};
  for (const [key, file] of Object.entries(cli)) if (file) docs[key] = { kind: "pdf", file };
  for (const [key, spec] of Object.entries(sources)) {
    if (docs[key]) continue;
    if (spec.images) {
      const files = [];
      for (const id of spec.images) files.push(await driveFile(id));
      docs[key] = { kind: "images", files };
    } else if (spec.pdf?.length) {
      docs[key] = { kind: "pdf", file: await drivePdf(spec.pdf) };
    }
  }
  return docs;
}
