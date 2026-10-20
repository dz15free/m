import { z } from "zod";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import {
  adminCommit,
  adminGet,
  newId,
  type Write,
} from "@/lib/server/firestore-admin";
import { netOf, revenueMonth } from "@/shared/billing/plans";

/* تصحيح سجل المدفوعات من لوحة الأدمن: حذف معاملة مسجّلة خطأً (تكرار تفعيل يدوي…) وإضافة معاملة يدوية
   (دفعة استُلمت خارج المنصة). كل عملية تعدّل إحصاء إيرادات شهر المعاملة في الدفعة الذرّية نفسها،
   ولا تمسّ اشتراك الأستاذ (يُدار من صفحته: إلغاء/تفعيل). للأدمن وحده، مع سجل تدقيق. */

async function requireAdmin(req: Request) {
  const user = await requireUser(req);
  if (!user.roles.admin) throw new HttpError(403, "forbidden");
  return user;
}

const statsWrite = (
  month: string,
  sign: 1 | -1,
  p: {
    gross: number;
    fees: number;
    net: number;
    method: string;
    planId: string;
  },
): Write => ({
  path: `stats/revenue_${month}`,
  data: { month },
  increments: {
    gross: sign * p.gross,
    fees: sign * p.fees,
    net: sign * p.net,
    count: sign,
    [`byMethod.${p.method}`]: sign * p.gross,
    [`byPlan.${p.planId}`]: sign * p.gross,
  },
});

const Add = z.object({
  email: z.string().trim().max(200).default(""),
  planId: z
    .string()
    .regex(/^[a-z0-9_-]{1,32}$/)
    .default("premium"),
  gross: z.number().int().min(1).max(10_000_000),
  fees: z.number().int().min(0).max(10_000_000).default(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(200).default(""),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    const body = Add.parse(await req.json().catch(() => ({})));
    // منتصف النهار بتوقيت الجزائر: الشهر لا يتغيّر بفارق المناطق
    const at = Date.parse(`${body.date}T12:00:00+01:00`);
    if (!Number.isFinite(at) || at > Date.now() + 86_400_000)
      throw new HttpError(400, "bad date");
    const id = `manual_${newId()}`;
    const net = netOf(body.gross, body.fees, false);
    const p = {
      gross: body.gross,
      fees: body.fees,
      net,
      method: "admin",
      planId: body.planId,
    };
    await adminCommit([
      {
        path: `payments/${id}`,
        data: {
          uid: "",
          planId: body.planId,
          method: "admin",
          currency: "dzd",
          gross: body.gross,
          fees: body.fees,
          net,
          sourceId: admin.uid,
          email: body.email,
          note: body.note,
          periodEnd: null,
          createdAt: new Date(at),
          manual: true,
        },
        precondition: { exists: false },
      },
      statsWrite(revenueMonth(at), 1, p),
      {
        path: `auditLogs/payadd_${id}`,
        data: {
          action: "admin.paymentAdd",
          by: admin.uid,
          paymentId: id,
          gross: body.gross,
          date: body.date,
          note: body.note,
          at: new Date(),
        },
      },
    ]);
    return Response.json({ id });
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json({ error: "bad request" }, { status: 400 });
    return errorResponse(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin(req);
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!/^[\w-]{1,128}$/.test(id)) throw new HttpError(400, "bad id");
    const doc = await adminGet(`payments/${id}`);
    if (!doc) throw new HttpError(404, "not found");
    const d = doc.data;
    const createdAt =
      typeof d.createdAt === "number" ? d.createdAt : Date.now();
    const p = {
      gross: Number(d.gross ?? 0),
      fees: Number(d.fees ?? 0),
      net: Number(d.net ?? 0),
      method: String(d.method ?? "admin"),
      planId: String(d.planId ?? "premium"),
    };
    await adminCommit([
      // الشرط المسبق: لا يُحذف مرتين (ضغطتان متتاليتان لا تُنقصان الإيرادات مرتين)
      {
        path: `payments/${id}`,
        data: {},
        delete: true,
        precondition: { updateTime: doc.updateTime },
      },
      statsWrite(revenueMonth(createdAt), -1, p),
      {
        path: `auditLogs/paydel_${id}`,
        data: {
          action: "admin.paymentDelete",
          by: admin.uid,
          paymentId: id,
          uid: String(d.uid ?? ""),
          gross: p.gross,
          method: p.method,
          at: new Date(),
        },
      },
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
