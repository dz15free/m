import { errorResponse, HttpError, requireUserWithToken } from "@/lib/server/auth";
import { getDocAs } from "@/lib/server/firestore-rest";
import { contentBucket } from "@/lib/server/storage";
import { ALLOWED_MIME, safeFileName, type ContentFile } from "@/features/library/logic";
import { accessOf, effectivePlan, type Entitlement } from "@/shared/billing/plans";

/* تحميل ملف من المكتبة. الحماية هنا على الخادم، لا في إخفاء الأزرار:
   1) مستخدم مسجَّل  2) المحتوى منشور (أو القارئ محرّر)
   3) الاشتراك يفتح كل شيء، والتجربة تفتح المحتوى المتاح للتجربة (access=free) فقط، وبلا اشتراك لا تحميل. */
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
    if (!editor) {
      const ent = (await getDocAs(`entitlements/${user.uid}`, user.token)) as Partial<Entitlement> | null;
      const access = accessOf(effectivePlan(ent, null));
      if (access === "locked" || (access === "trial" && content.access === "premium")) throw new HttpError(402, "premium required");
    }

    const object = await (await contentBucket()).get(file.key);
    if (!object) throw new HttpError(404, "not found");

    // النوع من وثيقة المحتوى: لا نثق به إلا ضمن القائمة المسموحة، وغيره يُنزَّل كملف
    const known = (ALLOWED_MIME as readonly string[]).includes(file.mime);
    const download = !known || new URL(req.url).searchParams.get("dl") === "1";
    const name = safeFileName(file.name);
    return new Response(object.body, {
      headers: {
        "Content-Type": known ? file.mime : "application/octet-stream",
        "Content-Length": String(object.size),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        // حتى لو عُرض ملف في المتصفح: بلا سكربتات ولا وصول لأصل الموقع
        "Content-Security-Policy": "sandbox; default-src 'none'",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
