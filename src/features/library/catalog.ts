/* «المكتبة الجاهزة»: ملفات مصنّفة (catalog.json) يستوردها الأدمن بزر واحد. معرّف كل محتوى ثابت (cat-…)،
   فما استُورد لا يُستورد مرتين. */
import type { Access, ContentDoc, ContentFile, ContentType, Localized } from "./logic";

export type CatalogEntry = {
  id: string;
  title: Localized;
  level: string;
  subject: string;
  language: "ar" | "fr" | "en";
  type: ContentType;
  term: 0 | 1 | 2 | 3;
  unit: string;
  tags: string[];
  excerpt: string;
  access: Access;
  author: string;
  license: "original" | "licensed" | "public";
  files: { driveId: string; name: string; mime: string; size: number | null }[];
};

export const pendingCatalog = (entries: CatalogEntry[], existing: Set<string>) => entries.filter((e) => !existing.has(e.id));

export function toContentDoc(e: CatalogEntry, files: ContentFile[]): ContentDoc {
  return {
    title: e.title,
    stage: "primary",
    level: e.level,
    subject: e.subject,
    language: e.language,
    type: e.type,
    term: e.term,
    unit: e.unit,
    tags: e.tags,
    excerpt: e.excerpt,
    access: e.access,
    author: e.author,
    license: e.license,
    files,
    previewKey: "",
    status: "published",
    publishedAt: null,
  };
}
