import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { HttpError } from "./auth";

/* قراءة مجلد «المكتبة» على Google Drive عبر Drive API بمفتاح السر DRIVE_API_KEY.
   المجلد مشارك للعموم؛ المفتاح مقيّد بـ Drive API ولا يغادر الخادم. */

/** المجلد الجذر لملفات المكتبة (يمكن تغييره بالمتغير DRIVE_LIBRARY_FOLDER). */
const DEFAULT_FOLDER = "1VFFlwa0aaWthRobn1CX0dQlFpZx-aPse";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const SHORTCUT_MIME = "application/vnd.google-apps.shortcut";
const API = "https://www.googleapis.com/drive/v3/files";

export type DriveFile = { id: string; name: string; path: string; mime: string; size: number };

async function env() {
  const { env } = await getCloudflareContext({ async: true });
  const e = env as { DRIVE_API_KEY?: string; DRIVE_LIBRARY_FOLDER?: string };
  return {
    key: e.DRIVE_API_KEY || process.env.DRIVE_API_KEY,
    folder: e.DRIVE_LIBRARY_FOLDER || process.env.DRIVE_LIBRARY_FOLDER || DEFAULT_FOLDER,
  };
}

export async function driveKey(): Promise<string> {
  const { key } = await env();
  if (!key) throw new HttpError(503, "drive key missing");
  return key;
}

async function driveJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const reason = ((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "";
    throw new HttpError(502, `drive api ${res.status} ${reason}`.trim().slice(0, 200));
  }
  return (await res.json()) as T;
}

type RawFile = { id: string; name: string; mimeType: string; size?: string; parents?: string[] };

/** كل الملفات تحت المجلد الجذر (مع المجلدات الفرعية)، بمسار نسبي. */
export async function listLibraryFolder(): Promise<DriveFile[]> {
  return listFolder((await env()).folder);
}

/** معرّف مجلد Drive صالح (من رابط يلصقه الأدمن). */
export const isDriveId = (id: string) => /^[A-Za-z0-9_-]{10,80}$/.test(id);

/** كل الملفات تحت أي مجلد Drive عام (مع المجلدات الفرعية حتى 4 مستويات)، بمسار نسبي. */
export async function listFolder(folder: string): Promise<DriveFile[]> {
  if (!isDriveId(folder)) throw new HttpError(400, "bad folder");
  const key = await driveKey();
  const out: DriveFile[] = [];
  const queue: { id: string; path: string; depth: number }[] = [{ id: folder, path: "", depth: 0 }];
  while (queue.length) {
    const dir = queue.shift()!;
    let pageToken = "";
    do {
      const q = encodeURIComponent(`'${dir.id}' in parents and trashed = false`);
      const data = await driveJson<{ files: RawFile[]; nextPageToken?: string }>(
        `${API}?q=${q}&fields=nextPageToken,files(id,name,mimeType,size)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&key=${key}${pageToken ? `&pageToken=${pageToken}` : ""}`,
      );
      for (const f of data.files) {
        const path = dir.path ? `${dir.path}/${f.name}` : f.name;
        if (f.mimeType === FOLDER_MIME) {
          if (dir.depth < 4) queue.push({ id: f.id, path, depth: dir.depth + 1 });
        } else {
          out.push({ id: f.id, name: f.name, path, mime: f.mimeType, size: Number(f.size ?? 0) });
        }
      }
      pageToken = data.nextPageToken ?? "";
    } while (pageToken);
  }
  return out;
}

// Drive لا يُرجع «parents» للطلبات بمفتاح API، فالتحقق يكون من قائمة المجلد نفسها (مخزّنة مؤقتًا دقائق)
let cached: { at: number; files: Map<string, DriveFile> } | null = null;
const CACHE_MS = 5 * 60 * 1000;

/** بيانات ملف والتحقق من أنه داخل مجلد المكتبة. */
export async function libraryFile(id: string): Promise<{ name: string; mime: string; size: number }> {
  let file = cached && Date.now() - cached.at < CACHE_MS ? cached.files.get(id) : undefined;
  if (!file) {
    // ملف أُضيف للتو أو انتهت صلاحية النسخة المخزّنة: نعيد القراءة مرة واحدة
    cached = { at: Date.now(), files: new Map((await listLibraryFolder()).map((f) => [f.id, f])) };
    file = cached.files.get(id);
  }
  if (!file) throw new HttpError(404, "not in library folder");
  return { name: file.name, mime: file.mime, size: file.size };
}

/** بيانات ملف عام على Drive بمعرّفه (لملف من مجلد ألصقه الأدمن، خارج مجلد المكتبة). */
export async function driveFileMeta(id: string): Promise<{ name: string; mime: string; size: number }> {
  if (!isDriveId(id)) throw new HttpError(400, "bad id");
  const key = await driveKey();
  const f = await driveJson<RawFile>(`${API}/${encodeURIComponent(id)}?fields=id,name,mimeType,size&supportsAllDrives=true&key=${key}`);
  if (f.mimeType === FOLDER_MIME) throw new HttpError(400, "is a folder");
  return { name: f.name, mime: f.mimeType, size: Number(f.size ?? 0) };
}

/** ملفات Google (مستندات، عروض، جداول، رسومات) تُصدَّر PDF؛ لا محتوى ثنائيًا لها لتُنزَّل كما هي. */
const EXPORTABLE = /^application\/vnd\.google-apps\.(document|presentation|spreadsheet|drawing)$/;

/** محتوى ملف Drive: الملف نفسه، أو أصلُه إن كان اختصارًا (shortcut)، أو نسخة PDF إن كان ملف Google. */
export async function fetchDriveMedia(id: string, depth = 0): Promise<Response> {
  const key = await driveKey();
  const res = await fetch(`${API}/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true&key=${key}`);
  if (res.ok && res.body) return res;
  const reason = ((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "";
  if (res.status === 403 && depth === 0 && /binary content|Export/i.test(reason)) {
    const meta = await driveJson<{ mimeType: string; shortcutDetails?: { targetId?: string } }>(
      `${API}/${encodeURIComponent(id)}?fields=mimeType,shortcutDetails&supportsAllDrives=true&key=${key}`,
    );
    // اختصار في المجلد: نجلب الملف الذي يشير إليه
    if (meta.mimeType === SHORTCUT_MIME && meta.shortcutDetails?.targetId) return fetchDriveMedia(meta.shortcutDetails.targetId, 1);
    if (EXPORTABLE.test(meta.mimeType)) {
      const pdf = await fetch(`${API}/${encodeURIComponent(id)}/export?mimeType=application%2Fpdf&key=${key}`);
      if (pdf.ok && pdf.body) return pdf;
      throw new HttpError(502, `drive export ${pdf.status}`);
    }
  }
  throw new HttpError(502, `drive api ${res.status} ${reason}`.trim().slice(0, 200));
}

/** ملف عام من Drive دون مفتاح (رابط التنزيل المباشر) — لملفات معروفة مسبقًا فقط. */
export async function fetchPublicDriveFile(id: string): Promise<Response> {
  const res = await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`);
  if (!res.ok || !res.body || (res.headers.get("content-type") ?? "").startsWith("text/html")) {
    throw new HttpError(502, `drive download ${res.status}`);
  }
  return res;
}
