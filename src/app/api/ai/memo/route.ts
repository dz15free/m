import Anthropic from "@anthropic-ai/sdk";
import { errorResponse, HttpError, requireUser, type AuthUser } from "@/lib/server/auth";
import { serverEnv } from "@/lib/server/env";
import { adminCommit, adminGet } from "@/lib/server/firestore-admin";
import { effectivePlan, type Entitlement } from "@/shared/billing/plans";
import { aiMemoRequest, languageOf, MEMO_SCHEMA, pickExample, SYSTEM_PROMPT, toMemo, userPrompt, type LessonContext } from "@/features/ai-memo/prompt";
import type { Memo } from "@/features/lessons/memo";
import examples from "@/features/ai-memo/examples.gen.json";

/* كاتب المذكرات بالذكاء الاصطناعي: للمشتركين (والتجربة بعدد أقل)، بحصة يومية في aiUsage/{uid}.
   الحصة تُحجز قبل الطلب (لا يتجاوزها طلبان متزامنان) وتُعاد إن فشل. حدود اليوم من config/app.aiDaily. */

const MODEL = "claude-opus-5-5";
const DEFAULT_LIMITS = { active: 10, trial: 3 };

type Usage = { day: string; n: number };

/** يوم الجزائر (UTC+1) */
const today = () => new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);

async function quotaOf(user: AuthUser): Promise<{ limit: number; usage: Usage; updateTime: string | null }> {
  const staff = user.roles.admin || user.roles.contentEditor;
  const [ent, config, usageDoc] = await Promise.all([
    adminGet(`entitlements/${user.uid}`),
    adminGet("config/app"),
    adminGet(`aiUsage/${user.uid}`),
  ]);
  const status = effectivePlan((ent?.data ?? null) as Partial<Entitlement> | null, null).status;
  const limits = { ...DEFAULT_LIMITS, ...((config?.data.aiDaily as Partial<typeof DEFAULT_LIMITS> | undefined) ?? {}) };
  const limit = staff ? 50 : status === "active" ? Number(limits.active) : status === "trial" ? Number(limits.trial) : 0;
  const raw = (usageDoc?.data ?? {}) as Partial<Usage>;
  const usage = raw.day === today() ? { day: raw.day, n: Number(raw.n) || 0 } : { day: today(), n: 0 };
  return { limit, usage, updateTime: usageDoc?.updateTime ?? null };
}

/** حالة الميزة للواجهة: متاحة؟ وكم بقي اليوم. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const { limit, usage } = await quotaOf(user);
    return Response.json({ available: !!serverEnv().ANTHROPIC_API_KEY, limit, remaining: Math.max(0, limit - usage.n) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const apiKey = serverEnv().ANTHROPIC_API_KEY;
    if (!apiKey) throw new HttpError(503, "ai unavailable");
    const parsed = aiMemoRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "invalid request");
    const input = parsed.data;
    if (input.lessonId && !input.lessonId.startsWith(`${input.level}_${input.subject}_`)) throw new HttpError(400, "invalid request");

    // حجز الحصة اليومية (شرط مسبق على النسخة: طلبان متزامنان لا يتجاوزان الحد)
    const { limit, usage, updateTime } = await quotaOf(user);
    if (limit === 0) throw new HttpError(402, "subscription required");
    if (usage.n >= limit) throw new HttpError(429, "daily limit");
    try {
      await adminCommit([
        {
          path: `aiUsage/${user.uid}`,
          data: { day: usage.day, n: usage.n + 1, updatedAt: new Date() },
          precondition: updateTime ? { updateTime } : { exists: false },
        },
      ]);
    } catch {
      throw new HttpError(409, "busy");
    }

    try {
      // سياق الحصة من مذكرات المنصة (الملخّص المنشور)، إن طُلبت حصة بعينها
      let ctx: LessonContext | null = null;
      if (input.lessonId) {
        const s = (await adminGet(`lessonSummaries/${input.lessonId}`))?.data;
        if (s) {
          ctx = {
            topic: typeof s.topic === "string" ? s.topic : undefined,
            domain: typeof s.domain === "string" ? s.domain : undefined,
            activity: typeof s.activity === "string" ? s.activity : undefined,
            segmentTitle: typeof s.segmentTitle === "string" ? s.segmentTitle : undefined,
            materials: typeof s.materials === "string" ? s.materials : undefined,
            objectives: Array.isArray(s.objectives) ? s.objectives.filter((o): o is string => typeof o === "string").slice(0, 8) : undefined,
          };
        }
      }
      const example = pickExample(examples as unknown as Record<string, { memo: Memo }>, input.level, input.subject);

      const client = new Anthropic({ apiKey });
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: { type: "json_schema", schema: MEMO_SCHEMA } },
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt(input, ctx, example) }],
      });
      if (response.stop_reason === "refusal") throw new HttpError(422, "refused");
      if (response.stop_reason === "max_tokens") throw new HttpError(502, "too long");
      const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      let result: ReturnType<typeof toMemo>;
      try {
        result = toMemo(JSON.parse(text), languageOf(input.subject));
      } catch {
        throw new HttpError(502, "bad output");
      }
      return Response.json({ ...result, lang: languageOf(input.subject), remaining: Math.max(0, limit - usage.n - 1) });
    } catch (error) {
      // فشل بعد الحجز: تُعاد الحصة
      await adminCommit([{ path: `aiUsage/${user.uid}`, data: { updatedAt: new Date() }, merge: true, increments: { n: -1 } }]).catch(() => {});
      if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) throw new HttpError(503, "ai busy");
      if (error instanceof Anthropic.APIError) {
        console.error("ai memo", error.status, error.message);
        throw new HttpError(502, "ai error");
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
