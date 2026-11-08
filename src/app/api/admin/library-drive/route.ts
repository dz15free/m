import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { listFolder, listLibraryFolder } from "@/lib/server/drive";

/* محتويات مجلد المكتبة على Google Drive (أو أي مجلد عام آخر بـ ?folder=<المعرّف>) — ليعرض الأدمن الملفات ويستوردها.
   للمحرّرين والأدمن فقط. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user.roles.admin && !user.roles.contentEditor) throw new HttpError(403, "forbidden");
    const folder = new URL(req.url).searchParams.get("folder");
    return Response.json({ files: folder ? await listFolder(folder) : await listLibraryFolder() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
