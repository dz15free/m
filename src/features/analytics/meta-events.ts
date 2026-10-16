/* أحداث التحويل لبكسل Meta. قواعد:
   - لا بيانات شخصية أبدًا (لا بريد ولا اسم ولا هاتف ولا معرّف الحساب): فقط نوع الحدث وقيم عامة.
   - كل حدث مرة واحدة لكل مفتاح (حساب/طلب) على هذا الجهاز، و`eventID` ثابت يتيح لـ Meta حذف المكرر.
   - البكسل لا يعمل أثناء التطوير؛ وإن لم يُحمَّل سكربته بعد ننتظره قليلًا. */

const enabled = process.env.NODE_ENV === "production";
const SENT_KEY = "metaEventsSent";

type MetaEvent = "CompleteRegistration" | "StartTrial" | "Purchase";

function sentSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function markSent(id: string) {
  try {
    const s = [...sentSet(), id].slice(-50);
    localStorage.setItem(SENT_KEY, JSON.stringify(s));
  } catch {
    // تخزين ممنوع (تصفّح خاص): يبقى eventID لحذف المكرر عند Meta
  }
}

// داخل الجلسة نفسها (إعادة التصيير، الاستدعاءات المتكررة) حتى لو تعذّر التخزين
const inFlight = new Set<string>();

/** يرسل الحدث مرة واحدة. `key` يميّز الحالة (معرّف عشوائي غير شخصي: رقم الطلب، أو تجزئة الحساب). */
export function trackOnce(event: MetaEvent, key: string, params?: Record<string, string | number | string[]>) {
  if (!enabled || typeof window === "undefined") return;
  const id = `${event}:${key}`;
  if (inFlight.has(id) || sentSet().has(id)) return;
  inFlight.add(id);
  let tries = 0;
  const send = () => {
    const fbq = (window as { fbq?: (...a: unknown[]) => void }).fbq;
    if (fbq) {
      fbq("track", event, params ?? {}, { eventID: id });
      markSent(id);
    } else if (++tries < 20) setTimeout(send, 500);
    else inFlight.delete(id);
  };
  send();
}

/** مفتاح غير قابل للعكس من معرّف الحساب (لا يُرسل المعرّف نفسه إلى Meta). */
export async function anonKey(uid: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`prof:${uid}`));
  return [...new Uint8Array(buf).slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
