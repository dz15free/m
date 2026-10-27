/**
 * الفرنسية (4AP/5AP): تجديد مقطع من المنهاج ببطاقات «Fiches pédagogiques 2026-2027» لـ REZAK Djillali Abdelkrim
 * (منشورة للعموم على Drive). كل صفحة بطاقة نشاط: «Activité : … Durée : N mn Thème : … Composante … Objectif … Outil…».
 * تحلّ حصص البطاقات محل حصص المقطع، وتُعرض صفحاتها صورًا من المصدر «<key>» (يُحمَّل عند النشر من Drive).
 * الصفحة بلا ترويسة (نص مرفق) تُلحق بالبطاقة السابقة. الأسابيع: توزيع البطاقات بالتتابع على أسابيع المقطع حسب مدتها.
 *
 *   node scripts/curriculum/refresh-fr-rezak.mjs <4AP_fr|5AP_fr> <segment> <key> <driveId> <fiches.pdf> <week,week,…>
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const [id, segArg, key, driveId, pdf, weeksArg] = process.argv.slice(2);
const segment = Number(segArg);
const weeks = weeksArg.split(",").map(Number);
const file = new URL(`../../content/curriculum/${id}.json`, import.meta.url);
const data = JSON.parse(readFileSync(file, "utf8"));
const squash = (s) => s.replace(/\s+/g, " ").trim();
const nPages = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())[1]);
const LABELS = String.raw`(?=Classe\s*:|Cours\s*:|Projet\s*\d|Séquence\s*\d|Activité\s*:|Durée\s*:|Thème\s*:|Actes? de parole\s*:|Compétence terminale\s*:|Composantes? de la compétence\s*:|Objectifs? d.apprentissage\s*:|Outils? didactiques?\s*:|Déroulement|$)`;
const field = (t, label) => squash(new RegExp(`${label}\\s*:\\s*(.*?)\\s*${LABELS}`).exec(t)?.[1] ?? "").replace(/[.\s]+$/, "");

const fiches = [];
for (let n = 2; n <= nPages; n++) {
  const t = squash(execFileSync("pdftotext", ["-f", String(n), "-l", String(n), pdf, "-"]).toString());
  const act = field(t, "Activité");
  if (!act) {
    if (!fiches.length) throw new Error(`page ${n}: pas d'en-tête`);
    fiches.at(-1).pages.push(`${key}:${n}`);
    continue;
  }
  const min = Number(/Durée\s*:\s*(\d+)/.exec(t)?.[1] ?? 30);
  const activity = act.charAt(0).toUpperCase() + act.slice(1);
  fiches.push({
    activity,
    min,
    theme: field(t, "Thème"),
    domain: field(t, "Composantes? de la compétence") || field(t, "Compétence terminale"),
    objective: field(t, "Objectifs? d.apprentissage"),
    tools: field(t, "Outils? didactiques?"),
    pages: [`${key}:${n}`],
  });
}

const old = data.lessons.filter((l) => l.segment === segment);
if (!old.length) throw new Error(`segment ${segment} vide`);
const segmentTitle = old[0].segmentTitle;
const total = fiches.reduce((s, f) => s + f.min, 0);
let acc = 0;
const fresh = fiches.map((f, i) => {
  const unit = weeks[Math.min(weeks.length - 1, Math.floor((acc / total) * weeks.length))];
  acc += f.min;
  return {
    segment,
    segmentTitle,
    unitKind: "week",
    unit,
    session: `Séance ${i + 1}/${fiches.length} (${f.min} min)`,
    activity: "Français",
    domain: f.domain,
    topic: f.theme ? `${f.activity} — ${f.theme}` : f.activity,
    materials: f.tools,
    objectives: f.objective ? [f.objective] : [],
    body: "",
    pages: f.pages,
    sample: old.some((l) => l.sample),
  };
});

const at = data.lessons.indexOf(old[0]);
const lessons = [...data.lessons.filter((l, i) => i < at && l.segment !== segment), ...fresh, ...data.lessons.filter((l, i) => i > at && l.segment !== segment)];
data.lessons = lessons.map((l, i) => {
  const { order, ...rest } = l;
  return { order: i + 1, ...rest };
});
data.sources = { ...data.sources, [key]: { pdf: [driveId] } };
writeFileSync(file, JSON.stringify(data, null, 1) + "\n");
console.log(`${id}: segment ${segment} — ${old.length} → ${fresh.length} séances (${fresh.map((l) => l.unit).join(",")})`);
