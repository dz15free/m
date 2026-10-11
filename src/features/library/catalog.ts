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
  files: CatalogFile[];
};

/** مصدر الملف: Drive، أو رابط عام من موقع مسموح (منشورات مجانية مع ذكر المصدر)، أو رفع من جهاز الأدمن
    (موادنا الخاصة: لا تُحفظ في المستودع العام). */
export type CatalogFile = { driveId?: string; url?: string; upload?: boolean; name: string; mime: string; size: number | null };

/** المواقع التي يُسمح للخادم بجلب ملفات «المكتبة الجاهزة» منها. */
export const CATALOG_URL_HOSTS = ["eddirasa.com"] as const;

export const isAllowedCatalogUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (CATALOG_URL_HOSTS as readonly string[]).includes(u.hostname);
  } catch {
    return false;
  }
};

/** المعرّف الذي يُرسل لمسار الاستيراد. */
export const catalogSource = (f: CatalogFile): { kind: "driveId" | "url" | "upload"; value: string } =>
  f.driveId ? { kind: "driveId", value: f.driveId } : f.url ? { kind: "url", value: f.url } : { kind: "upload", value: f.name };

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
