import { getCloudflareContext } from "@opennextjs/cloudflare";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import memoAssets from "@/lib/server/memo-assets.json";

/* ملف مذكرات مُنسّقة (content/memos/<id>.json) لصفحة النشر: للأدمن والمحرّر فقط. الملفات أصول ثابتة في مجلد
   اسمه سري (memo-assets.json، في الخادم وحده)، نقرؤها هنا عبر ربط ASSETS. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user.roles.admin && !user.roles.contentEditor) throw new HttpError(403, "forbidden");
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!/^[\w-]{3,40}$/.test(id)) throw new HttpError(400, "invalid id");
    const { env } = await getCloudflareContext({ async: true });
    if (!env.ASSETS) throw new HttpError(503, "assets not configured");
    const res = await env.ASSETS.fetch(new URL(`/${memoAssets.dir}/${id}.json`, req.url));
    if (!res.ok) throw new HttpError(404, "not found");
    return new Response(res.body, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
