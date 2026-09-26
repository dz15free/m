import { assess } from "./review.ts";
import { parseTable, type Table } from "./table.ts";

/* جودة قائمة مستخرجة: لاختيار أفضل قراءة بين «نص PDF» و«التعرّف على صورة الصفحة».
   بعض ملفات PDF العربية (برامج قديمة، خطوط بترميز خاص) تبدو سليمة على الشاشة لكن
   نصّها المخزّن مشوّه: حروف في غير مواضعها، وأسماء مقطوعة. نكشف ذلك بقواعد إملائية
   لا تخطئ في الأسماء الحقيقية تقريبًا. */

/** كلمة عربية مستحيلة إملائيًا (علامة على نص مشوّه الترميز). */
export function impossibleArabicWord(word: string): boolean {
  const w = word.normalize("NFKC").replace(/[^ء-ي]/g, "");
  if (w.length < 2) return false;
  // ة وى لا تكونان إلا آخر الكلمة؛ إ وأ لا تأتيان آخرها بعد حرف غير ألف؛ ء لا تتوسّط بين حرفين موصولين كثيرًا
  if (/[ةى]./.test(w)) return true;
  if (/[^اوءي]إ$/.test(w) || /.إ./.test(w.replace(/^(ال|و|ب|ف|ل|لل)/, ""))) return true;
  if (/^[ؤئ]/.test(w)) return true; // لا تبدأ كلمة بـ ؤ أو ئ
  if (/(.)\1\1/.test(w)) return true; // ثلاثة أحرف متماثلة متتالية
  if (/^ال[^ء-ي]*$/.test(w) || /^ال.$/.test(w)) return true; // «ال» وحدها أو مع حرف واحد
  return false;
}

export type Quality = { rows: number; ok: number; check: number; bad: number; missing: number; impossible: number; words: number; score: number };

export function listQuality(tables: Table[]): Quality {
  const q: Quality = { rows: 0, ok: 0, check: 0, bad: 0, missing: 0, impossible: 0, words: 0, score: 0 };
  for (const table of tables) {
    for (const c of parseTable(table).candidates) {
      q.rows++;
      const { status, reasons } = assess(c);
      q[status]++;
      if (reasons.includes("missingFirst") || reasons.includes("missingLast")) q.missing++;
      for (const w of `${c.last} ${c.first}`.split(/\s+/).filter(Boolean)) {
        q.words++;
        if (impossibleArabicWord(w)) q.impossible++;
      }
    }
  }
  q.score = q.ok * 2 + q.check - q.bad - q.impossible * 2;
  return q;
}

/** نص PDF مشكوك فيه ⇒ نجرّب قراءة صورة الصفحة ونقارن. */
export function looksBroken(q: Quality): boolean {
  if (q.rows === 0) return true;
  if (q.words && q.impossible / q.words > 0.05) return true;
  return q.missing / q.rows > 0.5 || (q.ok + q.check) / q.rows < 0.5;
}
