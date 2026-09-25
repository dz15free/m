import { errorResponse, HttpError, requireUserWithToken } from "@/lib/server/auth";
import { getDocAs } from "@/lib/server/firestore-rest";
import { contentBucket } from "@/lib/server/storage";
import { safeFileName, type ContentFile } from "@/features/library/logic";
import { effectivePlan, type Entitlement } from "@/shared/billing/plans";

/* تحميل ملف من المكتبة. الحماية هنا على الخادم، لا في إخفاء الأزرار:
   1) مستخدم مسجَّل  2) المحتوى منشور (أو القارئ محرّر)  3) Premium ⇐ اشتراك فعّال. */
export async function GET(req: Request, { params }: RouteContext<"/api/files/[contentId]/[index]">) {
  try {
    const user = await requireUserWithToken(req);
    const { contentId, index } = await params;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(contentId)) throw new HttpError(404, "not found");

    const content = await getDocAs(`contents/${contentId}`, user.token);
    if (!content) throw new HttpError(404, "not found");
    const file = (content.files as ContentFile[] | undefined)?.[Number(index)];
    if (!file) throw new HttpError(404, "not found");

    const editor = user.roles.admin || user.roles.contentEditor;
    if (content.access === "premium" && !editor) {
      const ent = (await getDocAs(`entitlements/${user.uid}`, user.token)) as Partial<Entitlement> | null;
      if (effectivePlan(ent, null).contentAccess !== "premium") throw new HttpError(402, "premium required");
    }

    const object = await (await contentBucket()).get(file.key);
    if (!object) throw new HttpError(404, "not found");

    const download = new URL(req.url).searchParams.get("dl") === "1";
    const name = safeFileName(file.name);
    return new Response(object.body, {
      headers: {
        "Content-Type": file.mime,
        "Content-Length": String(object.size),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
