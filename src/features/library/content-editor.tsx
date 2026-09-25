"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Check, FileText, LoaderCircle, Lock, Plus, ShieldAlert, Trash2, Upload } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, SelectField } from "@/components/ui/field";
import { useAuth } from "@/features/auth/auth-provider";
import { useTaxonomy } from "@/features/classes/hooks";
import { STAGES, type Stage } from "@/shared/dz/education";
import { levelById, subjectById } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import { CONTENT_TYPES, formatSize, MAX_FILE_BYTES, type ContentDoc, type ContentFile, type ContentType } from "./logic";
import { deleteContent, getContent, listContentsForEditor, previewUrl, removeFile, saveContent, uploadFile } from "./repo";
import { titleOf } from "./library-browser";

export function useIsEditor() {
  const auth = useAuth();
  return auth.status === "signedIn" && (auth.roles.includes("admin") || auth.roles.includes("contentEditor"));
}

function EditorGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations("contentAdmin");
  if (!useIsEditor()) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <ShieldAlert aria-hidden className="size-8 text-red-700" />
        <p className="text-muted">{t("forbidden")}</p>
        <Link href="/app" className={buttonClass("secondary")}>{t("backToApp")}</Link>
      </Card>
    );
  }
  return <>{children}</>;
}

// ── القائمة ──

export function ContentAdminList() {
  return (
    <EditorGate>
      <AdminList />
    </EditorGate>
  );
}

function AdminList() {
  const t = useTranslations("contentAdmin");
  const tl = useTranslations("library");
  const tp = useTranslations("profile.stages");
  const locale = useLocale() as "ar" | "fr";
  const [stage, setStage] = useState<Stage>("primary");
  const tax = useTaxonomy(stage);
  const list = useQuery({ queryKey: ["contentsAdmin", stage], queryFn: () => listContentsForEditor(stage) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <SelectField label={t("stage")} value={stage} onChange={(e) => setStage(e.target.value as Stage)} className="min-w-40">
          {STAGES.map((s) => (
            <option key={s} value={s}>{tp(s)}</option>
          ))}
        </SelectField>
        <Link href={`/app/manage/content/new?stage=${stage}`} className={buttonClass("primary")}>
          <Plus aria-hidden className="size-4" />
          {t("new")}
        </Link>
      </div>
      {!list.data || !tax.data ? (
        <div role="status" className="grid place-items-center py-12">
          <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
        </div>
      ) : list.data.length === 0 ? (
        <Card className="py-10 text-center text-muted">{t("empty")}</Card>
      ) : (
        <>
          <p className="text-sm text-muted">{t("count", { n: list.data.length })}</p>
          <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
            {list.data.map((c) => (
              <li key={c.id}>
                <Link href={`/app/manage/content/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-50">
                  <span className="min-w-0 flex-1">
                    <span dir="auto" className="block truncate font-medium">{titleOf(c.title, locale)}</span>
                    <span className="block truncate text-xs text-muted">
                      {[tl(`types.${c.type}`), c.level && levelById(tax.data, c.level)?.short[locale], c.subject && subjectById(tax.data, c.subject)?.label[locale]]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {c.access === "premium" && <Lock aria-label={tl("premium")} className="size-4 text-accent-700" />}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      c.status === "published" ? "bg-green-50 text-green-800" : c.status === "draft" ? "bg-amber-50 text-amber-900" : "bg-canvas text-muted",
                    )}
                  >
                    {t(`status.${c.status}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ── النموذج ──

const blank = (stage: Stage): ContentDoc => ({
  title: { ar: "", fr: "" },
  stage,
  level: "",
  subject: "",
  language: "ar",
  type: "fiche",
  term: 0,
  unit: "",
  tags: [],
  excerpt: "",
  access: "free",
  author: "",
  license: "original",
  files: [],
  previewKey: "",
  status: "draft",
  publishedAt: null,
});

export function ContentAdminEditor({ contentId, stage }: { contentId: string; stage?: string }) {
  return (
    <EditorGate>
      <EditorLoader contentId={contentId} stage={(STAGES as readonly string[]).includes(stage ?? "") ? (stage as Stage) : "primary"} />
    </EditorGate>
  );
}

function EditorLoader({ contentId, stage }: { contentId: string; stage: Stage }) {
  const isNew = contentId === "new";
  const content = useQuery({ queryKey: ["contentAdmin", contentId], queryFn: () => getContent(contentId), enabled: !isNew });
  if (!isNew && content.isPending) {
    return (
      <div role="status" className="grid place-items-center py-12">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  const initial = isNew || !content.data ? blank(stage) : (({ id: _id, updatedAt: _u, ...rest }) => (void _id, void _u, rest))(content.data);
  return <EditorForm key={contentId} id={isNew ? undefined : contentId} initial={initial} />;
}

function EditorForm({ id, initial }: { id?: string; initial: ContentDoc }) {
  const t = useTranslations("contentAdmin");
  const tl = useTranslations("library");
  const tp = useTranslations("profile.stages");
  const locale = useLocale() as "ar" | "fr";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ContentDoc>(initial);
  const [tags, setTags] = useState(initial.tags.join("، "));
  // بعد الإنشاء ننتقل إلى الرابط الدائم مع ?saved=1 ليبقى تأكيد الحفظ ظاهرًا
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(useSearchParams().get("saved") === "1" ? "saved" : "idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewInput = useRef<HTMLInputElement>(null);
  const tax = useTaxonomy(draft.stage);
  const set = <K extends keyof ContentDoc>(k: K, v: ContentDoc[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setState("idle");
  };

  async function addFiles(list: FileList | null, kind: "content" | "preview") {
    if (!list?.length) return;
    setUploading(true);
    setProblem(null);
    try {
      for (const f of Array.from(list)) {
        const up = await uploadFile(f, kind);
        if (kind === "preview") {
          if (draft.previewKey) void removeFile(draft.previewKey);
          set("previewKey", up.key);
        } else setDraft((d) => ({ ...d, files: [...d.files, up] }));
      }
    } catch {
      setProblem(t("uploadError", { mb: MAX_FILE_BYTES / 1024 / 1024 }));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const next: ContentDoc = {
      ...draft,
      title: { ar: draft.title.ar.trim(), fr: draft.title.fr.trim() },
      unit: draft.unit.trim(),
      excerpt: draft.excerpt.trim(),
      author: draft.author.trim(),
      tags: [...new Set(tags.split(/[,،\n]/).map((x) => x.trim()).filter(Boolean))].slice(0, 20),
    };
    if (!next.title.ar && !next.title.fr) return setProblem(t("needTitle"));
    if (next.status === "published" && !next.files.length) return setProblem(t("needFile"));
    setProblem(null);
    setState("saving");
    try {
      const newId = await saveContent(next, id);
      await queryClient.invalidateQueries({ queryKey: ["contentsAdmin"] });
      await queryClient.invalidateQueries({ queryKey: ["contentIndex", next.stage] });
      queryClient.removeQueries({ queryKey: ["content", newId] });
      setState("saved");
      if (!id) router.replace(`/app/manage/content/${newId}?saved=1`);
    } catch {
      setState("error");
    }
  }

  async function remove() {
    if (!id || !window.confirm(t("deleteConfirm"))) return;
    await deleteContent(id, initial.stage, draft.files, draft.previewKey);
    await queryClient.invalidateQueries({ queryKey: ["contentsAdmin"] });
    router.replace("/app/manage/content");
  }

  const taxonomy = tax.data;
  const levels = taxonomy?.levels ?? [];
  const subjects = (taxonomy?.subjects ?? []).filter((s) => !draft.level || s.levels.includes(draft.level));

  return (
    <div className="space-y-4 pb-4">
      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("titleAr")} dir="rtl" maxLength={200} value={draft.title.ar} onChange={(e) => set("title", { ...draft.title, ar: e.target.value })} />
          <Field label={t("titleFr")} dir="ltr" maxLength={200} value={draft.title.fr} onChange={(e) => set("title", { ...draft.title, fr: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SelectField label={t("stage")} value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as Stage, level: "", subject: "" })}>
            {STAGES.map((s) => (
              <option key={s} value={s}>{tp(s)}</option>
            ))}
          </SelectField>
          <SelectField label={t("level")} value={draft.level} onChange={(e) => set("level", e.target.value)}>
            <option value="">{t("any")}</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>{l.label[locale]}</option>
            ))}
          </SelectField>
          <SelectField label={t("subject")} value={draft.subject} onChange={(e) => set("subject", e.target.value)}>
            <option value="">{t("any")}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.label[locale]}</option>
            ))}
          </SelectField>
          <SelectField label={t("type")} value={draft.type} onChange={(e) => set("type", e.target.value as ContentType)}>
            {CONTENT_TYPES.map((ty) => (
              <option key={ty} value={ty}>{tl(`types.${ty}`)}</option>
            ))}
          </SelectField>
          <SelectField label={t("term")} value={draft.term} onChange={(e) => set("term", Number(e.target.value) as ContentDoc["term"])}>
            <option value={0}>{t("noTerm")}</option>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>{tl("term", { n })}</option>
            ))}
          </SelectField>
          <SelectField label={t("language")} value={draft.language} onChange={(e) => set("language", e.target.value as ContentDoc["language"])}>
            {(["ar", "fr", "en"] as const).map((l) => (
              <option key={l} value={l}>{t(`languages.${l}`)}</option>
            ))}
          </SelectField>
          <SelectField label={t("access")} value={draft.access} onChange={(e) => set("access", e.target.value as ContentDoc["access"])}>
            <option value="free">{tl("free")}</option>
            <option value="premium">{tl("premium")}</option>
          </SelectField>
          <SelectField label={t("license")} value={draft.license} onChange={(e) => set("license", e.target.value as ContentDoc["license"])}>
            {(["original", "licensed", "public"] as const).map((l) => (
              <option key={l} value={l}>{t(`licenses.${l}`)}</option>
            ))}
          </SelectField>
        </div>
        <p className="text-xs text-muted">{t("licenseHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("unit")} dir="auto" maxLength={120} value={draft.unit} onChange={(e) => set("unit", e.target.value)} />
          <Field label={t("author")} dir="auto" maxLength={120} value={draft.author} onChange={(e) => set("author", e.target.value)} />
        </div>
        <Field label={t("tags")} dir="auto" value={tags} onChange={(e) => setTags(e.target.value)} />
        <label className="block space-y-1.5">
          <span className="block text-sm font-medium">{t("excerpt")}</span>
          <textarea
            value={draft.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            maxLength={1000}
            rows={3}
            dir="auto"
            className="block w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100"
          />
        </label>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t("files")}</h2>
        <ul className="space-y-2">
          {draft.files.map((f: ContentFile, i) => (
            <li key={f.key} className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2">
              <FileText aria-hidden className="size-4 shrink-0 text-muted" />
              <bdi className="min-w-0 flex-1 truncate text-sm">{f.name}</bdi>
              <span className="text-xs text-muted" dir="ltr">{formatSize(f.size)}</span>
              <button
                type="button"
                onClick={() => {
                  void removeFile(f.key);
                  setDraft((d) => ({ ...d, files: d.files.filter((_, j) => j !== i) }));
                }}
                className="text-sm font-medium text-red-700"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => addFiles(e.target.files, "content")} />
        <button type="button" disabled={uploading || draft.files.length >= 10} onClick={() => fileInput.current?.click()} className={buttonClass("secondary")}>
          {uploading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Upload aria-hidden className="size-4" />}
          {uploading ? t("uploading") : t("addFile")}
        </button>

        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-sm font-medium">{t("preview")}</p>
          {draft.previewKey && (
            // eslint-disable-next-line @next/next/no-img-element -- معاينة من R2
            <img src={previewUrl(draft.previewKey)} alt="" className="h-32 rounded-xl object-cover" />
          )}
          <input ref={previewInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => addFiles(e.target.files, "preview")} />
          <div className="flex gap-2">
            <button type="button" disabled={uploading} onClick={() => previewInput.current?.click()} className={buttonClass("secondary")}>
              {t("addPreview")}
            </button>
            {draft.previewKey && (
              <button
                type="button"
                onClick={() => {
                  void removeFile(draft.previewKey);
                  set("previewKey", "");
                }}
                className={buttonClass("ghost", "md", "text-red-700")}
              >
                {t("remove")}
              </button>
            )}
          </div>
        </div>
      </Card>

      {problem && <p role="alert" className="text-sm font-medium text-red-700">{problem}</p>}
      {state === "error" && <p role="alert" className="text-sm font-medium text-red-700">{t("saveError")}</p>}

      <div className="sticky bottom-24 z-10 flex flex-wrap items-center gap-2 rounded-card bg-surface/95 p-3 shadow-float backdrop-blur lg:bottom-4">
        <select
          value={draft.status}
          onChange={(e) => set("status", e.target.value as ContentDoc["status"])}
          aria-label={t("status.published")}
          className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm font-medium outline-none"
        >
          {(["draft", "published", "archived"] as const).map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>
        <button type="button" onClick={save} disabled={state === "saving" || uploading} className={buttonClass("primary")}>
          {state === "saving" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : state === "saved" ? <Check aria-hidden className="size-4" /> : null}
          {state === "saved" ? t("saved") : t("save")}
        </button>
        {id && (
          <button type="button" onClick={remove} className={buttonClass("ghost", "md", "ms-auto text-red-700")}>
            <Trash2 aria-hidden className="size-4" />
            {t("delete")}
          </button>
        )}
      </div>
    </div>
  );
}
