import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { listLibraryFolder } from "@/lib/server/drive";

/* محتويات مجلد المكتبة على Google Drive — ليعرض الأدمن الملفات الجديدة ويستوردها. للمحرّرين والأدمن فقط. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user.roles.admin && !user.roles.contentEditor) throw new HttpError(403, "forbidden");
    return Response.json({ files: await listLibraryFolder() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
