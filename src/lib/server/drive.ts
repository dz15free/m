import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { HttpError } from "./auth";

/* قراءة مجلد «المكتبة» على Google Drive عبر Drive API بمفتاح السر DRIVE_API_KEY.
   المجلد مشارك للعموم؛ المفتاح مقيّد بـ Drive API ولا يغادر الخادم. */

/** المجلد الجذر لملفات المكتبة (يمكن تغييره بالمتغير DRIVE_LIBRARY_FOLDER). */
const DEFAULT_FOLDER = "1VFFlwa0aaWthRobn1CX0dQlFpZx-aPse";
const FOLDER_MIME = "application/vnd.google-apps.folder";
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
  const { folder } = await env();
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

/** بيانات ملف والتحقق من أنه داخل مجلد المكتبة (تتبّع الآباء حتى الجذر). */
export async function libraryFile(id: string): Promise<{ name: string; mime: string; size: number }> {
  const { folder } = await env();
  const key = await driveKey();
  const meta = await driveJson<RawFile>(`${API}/${encodeURIComponent(id)}?fields=id,name,mimeType,size,parents&supportsAllDrives=true&key=${key}`);
  let parents = meta.parents ?? [];
  for (let depth = 0; depth < 6 && parents.length; depth++) {
    if (parents.includes(folder)) return { name: meta.name, mime: meta.mimeType, size: Number(meta.size ?? 0) };
    const up = await driveJson<RawFile>(`${API}/${encodeURIComponent(parents[0]!)}?fields=id,parents&supportsAllDrives=true&key=${key}`);
    parents = up.parents ?? [];
  }
  throw new HttpError(404, "not in library folder");
}

export async function fetchDriveMedia(id: string): Promise<Response> {
  const key = await driveKey();
  const res = await fetch(`${API}/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true&key=${key}`);
  if (!res.ok || !res.body) {
    const reason = ((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "";
    throw new HttpError(502, `drive api ${res.status} ${reason}`.trim().slice(0, 200));
  }
  return res;
}
