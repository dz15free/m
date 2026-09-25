/* مكتبة المحتوى: نموذج البيانات، فهرس البحث المضغوط، والبحث المحلي.
   المكتبة كلها لمرحلة واحدة في وثيقة `contentIndex/{stage}` (قراءة واحدة)،
   والبحث والتصفية يجريان على الجهاز — فوري ويعمل دون إنترنت. */

import { nameKey } from "../../shared/text/names.ts";

export const CONTENT_TYPES = [
  "fiche",
  "progression",
  "exercise",
  "evaluation",
  "exam",
  "poster",
  "template",
  "adminDoc",
  "audio",
  "video",
  "image",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export type Access = "free" | "premium";
export type ContentStatus = "draft" | "published" | "archived";
export type Localized = { ar: string; fr: string };

export type ContentFile = { key: string; name: string; mime: string; size: number };

export type ContentDoc = {
  title: Localized;
  stage: "primary" | "middle" | "secondary";
  level: string; // من taxonomy (مثل 3AP) أو "" لكل المستويات
  subject: string; // من taxonomy أو "" لكل المواد
  language: "ar" | "fr" | "en";
  type: ContentType;
  term: 0 | 1 | 2 | 3; // 0 = غير مرتبط بفصل
  unit: string;
  tags: string[];
  excerpt: string;
  access: Access;
  author: string;
  license: "original" | "licensed" | "public";
  files: ContentFile[];
  previewKey: string; // صورة معاينة عامة (اختيارية)
  status: ContentStatus;
  publishedAt: number | null; // ms
  updatedAt?: unknown;
};

/** سطر الفهرس: ما يكفي للبحث والعرض في القائمة دون قراءة المستند. */
export type IndexEntry = {
  id: string;
  t: Localized;
  l: string;
  s: string;
  ty: ContentType;
  tm: number;
  a: Access;
  lang: string;
  tags: string[];
  u: string;
  pk: string; // مفتاح صورة المعاينة أو ""
  at: number; // publishedAt
};

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export function toIndexEntry(id: string, c: ContentDoc): IndexEntry {
  return {
    id,
    t: c.title,
    l: c.level,
    s: c.subject,
    ty: c.type,
    tm: c.term,
    a: c.access,
    lang: c.language,
    tags: c.tags,
    u: c.unit,
    pk: c.previewKey,
    at: c.publishedAt ?? 0,
  };
}

// ── البحث ──

/** كلمات موحّدة: بلا تشكيل ولا همزات ولا نبرات. */
function tokenize(text: string): string[] {
  return nameKey(text)
    .split(" ")
    .filter((w) => w.length > 1);
}

/** الكلمة ودونها «ال» التعريف: «الوان» قد تكون «ألوان» أو «ال+وان»، فنقبل الشكلين. */
const variants = (w: string) => (w.length > 3 && w.startsWith("ال") ? [w, w.slice(2)] : [w]);

export function entryTokens(e: IndexEntry): string[] {
  return tokenize([e.t.ar, e.t.fr, e.u, ...e.tags].join(" ")).flatMap(variants);
}

export type Filters = { level?: string; subject?: string; type?: string; access?: Access | "" };

/** كل كلمة في الطلب يجب أن تطابق بداية كلمة في العنوان/الوسوم/الوحدة. */
export function search(entries: IndexEntry[], query: string, f: Filters = {}): IndexEntry[] {
  const q = tokenize(query);
  const matches = entries.filter(
    (e) =>
      (!f.level || !e.l || e.l === f.level) &&
      (!f.subject || !e.s || e.s === f.subject) &&
      (!f.type || e.ty === f.type) &&
      (!f.access || e.a === f.access),
  );
  if (!q.length) return matches.sort((a, b) => b.at - a.at);
  const scored = matches
    .map((e) => {
      const toks = entryTokens(e);
      const title = tokenize(`${e.t.ar} ${e.t.fr}`).flatMap(variants);
      let score = 0;
      for (const w of q) {
        const forms = variants(w);
        if (!toks.some((t) => forms.some((f) => t.startsWith(f)))) return null;
        score += title.some((t) => forms.includes(t)) ? 3 : title.some((t) => forms.some((f) => t.startsWith(f))) ? 2 : 1;
      }
      return { e, score };
    })
    .filter((x): x is { e: IndexEntry; score: number } => x !== null);
  return scored.sort((a, b) => b.score - a.score || b.e.at - a.e.at).map((x) => x.e);
}

/** اسم ملف آمن للتحميل (Content-Disposition). */
export function safeFileName(name: string): string {
  const clean = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  return clean || "file";
}

export const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
