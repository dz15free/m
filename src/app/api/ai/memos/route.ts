import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import {
  adminCommit,
  adminDelete,
  adminGet,
  adminListAll,
  newId,
} from "@/lib/server/firestore-admin";
import { MAX_SAVED_HTML, sanitizeMemoHtml } from "@/features/ai-memo/sanitize";

/* مذكرات الأستاذ المحفوظة (المكتوبة بالذكاء الاصطناعي بعد تعديلها): teachers/{uid}/aiMemos/{id}.
   عبر الخادم فقط (لا قواعد Firestore جديدة): كل أستاذ يقرأ ويكتب مذكراته هو. */
const MAX_MEMOS = 100;
const col = (uid: string) => `teachers/${uid}/aiMemos`;
const validId = (id: string | null): id is string =>
  !!id && /^[a-z0-9]{20}$/.test(id);
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** القائمة (دون المحتوى)، أو مذكرة واحدة بـ ?id= */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const id = new URL(req.url).searchParams.get("id");
    if (id !== null) {
      if (!validId(id)) throw new HttpError(400, "invalid id");
      const doc = await adminGet(`${col(user.uid)}/${id}`);
      if (!doc) throw new HttpError(404, "not found");
      return Response.json({
        id,
        ...doc.data,
        html: sanitizeMemoHtml(String(doc.data.html ?? "")),
      });
    }
    const list = await adminListAll(
      col(user.uid),
      ["title", "level", "subject", "lang", "updatedAt"],
      MAX_MEMOS,
    );
    const items = list
      .map((d) => ({
        id: d.id,
        title: String(d.data.title ?? ""),
        level: String(d.data.level ?? ""),
        subject: String(d.data.subject ?? ""),
        lang: String(d.data.lang ?? "ar"),
        updatedAt:
          d.data.updatedAt instanceof Date
            ? d.data.updatedAt.getTime()
            : Date.parse(String(d.data.updatedAt ?? "")) || 0,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return Response.json({ items, max: MAX_MEMOS });
  } catch (error) {
    return errorResponse(error);
  }
}

/** حفظ جديد، أو تحديث مذكرة موجودة بـ id */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) throw new HttpError(400, "invalid request");
    const html = sanitizeMemoHtml(
      typeof body.html === "string" ? body.html : "",
    );
    if (!html.trim() || html.length > MAX_SAVED_HTML)
      throw new HttpError(400, "invalid content");
    const level = str(body.level, 8);
    const subject = str(body.subject, 32);
    if (
      !/^(?:PRE|[1-5]AP|[1-4]AM|[1-3]AS-[A-Z]{1,2})$/.test(level) ||
      !/^[a-z]{2,16}$/.test(subject)
    )
      throw new HttpError(400, "invalid request");
    const lang = body.lang === "fr" || body.lang === "en" ? body.lang : "ar";
    const title = str(body.title, 200) || "—";
    const given = typeof body.id === "string" ? body.id : null;
    let id: string;
    if (given !== null) {
      if (!validId(given) || !(await adminGet(`${col(user.uid)}/${given}`)))
        throw new HttpError(404, "not found");
      id = given;
    } else {
      const count = (
        await adminListAll(col(user.uid), ["title"], MAX_MEMOS + 1)
      ).length;
      if (count >= MAX_MEMOS) throw new HttpError(409, "too many");
      id = newId().toLowerCase();
    }
    const now = new Date();
    await adminCommit([
      {
        path: `${col(user.uid)}/${id}`,
        data: {
          title,
          level,
          subject,
          lang,
          html,
          updatedAt: now,
          ...(given ? {} : { createdAt: now }),
        },
        ...(given ? { merge: true } : { precondition: { exists: false } }),
      },
    ]);
    return Response.json({ id });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!validId(id)) throw new HttpError(400, "invalid id");
    await adminDelete([`${col(user.uid)}/${id}`]);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
