import type { ReactNode } from "react";
import { columnWidths, parseBlocks, parseInline, type Block, type Inline, type MathNode, type Memo } from "./memo";
import s from "./memo-sheet.module.css";

/* المذكرة بقالب المنصة الموحّد: محتوى المذكرة كما هو، والشكل والشعار للمنصة. */

export type MemoLang = "ar" | "fr" | "en";

const L = {
  ar: { teacher: "الأستاذ(ة)", school: "المؤسسة", class: "القسم", date: "التاريخ", by: (a: string) => `إعداد: ${a} · تنسيق: مساعد الأستاذ`, own: "مذكرة من إعداد المنصة", shared: "مذكرة أستاذ منشورة للعموم · تنسيق: مساعد الأستاذ", brand: "مساعد الأستاذ" },
  fr: { teacher: "Enseignant(e)", school: "Établissement", class: "Classe", date: "Date", by: (a: string) => `Fiche : ${a} · Mise en forme : مساعد الأستاذ`, own: "Fiche préparée par la plateforme", shared: "Fiche d'enseignant partagée · Mise en forme : مساعد الأستاذ", brand: "مساعد الأستاذ" },
  en: { teacher: "Teacher", school: "School", class: "Class", date: "Date", by: (a: string) => `Lesson plan: ${a} · Layout: مساعد الأستاذ`, own: "Lesson plan by the platform", shared: "Teacher's shared lesson plan · Layout: مساعد الأستاذ", brand: "مساعد الأستاذ" },
} as const;

type Props = {
  memo: Memo;
  lang: MemoLang;
  title: string;
  /** «رياضيات · 4 متوسط» */
  tag: string;
  /** «المقطع 1 · الأسبوع 5» */
  meta?: string;
  /** الاسم إن كان معروفًا، وإلا سطر فارغ يُملأ باليد */
  teacher?: string;
  /** مصدر صورة لشكل لم يُقتطع بعد (المعاينة قبل النشر) */
  figSrc?: (ref: string, box: [number, number, number, number]) => string | undefined;
  /** مسار الشعار (المعاينة خارج التطبيق تمرّر مسارًا محليًا) */
  assets?: { logo: string; mark: string };
};

export function MemoSheet({ memo, lang, title, tag, meta, teacher, figSrc, assets = { logo: "/brand/logo-360.webp", mark: "/brand/mark-128.webp" } }: Props) {
  const t = L[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const ctx: Ctx = { imgs: memo.imgs ?? [], figSrc };
  const widths = columnWidths(memo);
  return (
    <div className={s.sheet} dir={dir} lang={lang}>
      <header className={s.top}>
        {/* eslint-disable-next-line @next/next/no-img-element -- شعار ثابت يُطبع مع الوثيقة */}
        <img className={s.logo} src={assets.logo} alt={t.brand} />
        <div className={s.who}>
          <div>
            <b>{t.teacher}:</b> {teacher ? <span>{teacher}</span> : <span className={s.blank} />}
          </div>
          <div>
            <b>{t.school}:</b> <span className={s.blank} />
          </div>
          <div>
            <b>{t.class}:</b> <span className={`${s.blank} ${s.short}`} /> <b>{t.date}:</b> <span className={`${s.blank} ${s.short}`} />
          </div>
        </div>
      </header>

      <div className={s.band}>
        <span className={s.tag}>{tag}</span>
        <h1>{title}</h1>
        {meta && <span className={s.num}>{meta}</span>}
      </div>

      {memo.head.length > 0 && (
        <div className={s.card}>
          {pairHead(memo.head).map(([label, value, full], i) => (
            <div key={i} className={full ? s.full : undefined}>
              <b>{label}:</b> <Inlines c={parseInline(value)} />
            </div>
          ))}
        </div>
      )}

      {memo.pre && (
        <div className={s.pre}>
          <Blocks blocks={parseBlocks(memo.pre)} ctx={ctx} />
        </div>
      )}

      {memo.rows.length > 0 && (
        <table className={s.flow}>
          <colgroup>
            {widths.map((w, j) => (
              <col key={j} style={{ width: `${w}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {memo.cols.map((c, j) => (
                <th key={j}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {memo.rows.map((row, i) => (
              <tr key={i}>
                {memo.cols.map((c, j) => (
                  <td key={j}>
                    {row[j]?.trim() ? (
                      <>
                        <span className={s.cellLabel}>{c}</span>
                        <Blocks blocks={parseBlocks(row[j])} ctx={ctx} />
                      </>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {memo.after && (
        <div className={s.after}>
          <Blocks blocks={parseBlocks(memo.after)} ctx={ctx} />
        </div>
      )}

      <footer className={s.foot}>
        <span className={s.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element -- علامة ثابتة */}
          <img src={assets.mark} alt="" />
          {t.brand}
        </span>
        <span>{tag}</span>
        <span>{memo.author ? t.by(memo.author) : memo.own ? t.own : t.shared}</span>
      </footer>
    </div>
  );
}

/** حقول قصيرة تتجاور اثنين اثنين، والطويلة بعرض البطاقة. */
function pairHead(head: [string, string][]): [string, string, boolean][] {
  const short = ([l, v]: [string, string]) => l.length + v.length <= 58;
  const out: [string, string, boolean][] = [];
  for (let i = 0; i < head.length; i++) {
    const a = head[i]!;
    const b = head[i + 1];
    if (short(a) && b && short(b)) {
      out.push([...a, false], [...b, false]);
      i++;
    } else out.push([...a, true]);
  }
  return out;
}

type Ctx = { imgs: string[]; figSrc?: Props["figSrc"] };

function Blocks({ blocks, ctx }: { blocks: Block[]; ctx: Ctx }) {
  return blocks.map((b, i) => <BlockView key={i} b={b} ctx={ctx} />);
}

function BlockView({ b, ctx }: { b: Block; ctx: Ctx }): ReactNode {
  switch (b.t) {
    case "p":
      return (
        <p className={s.p}>
          <Inlines c={b.c} />
        </p>
      );
    case "h":
      return (
        <p className={s.h}>
          <Inlines c={b.c} />
        </p>
      );
    case "gap":
      return <div className={s.gap} />;
    case "ul":
      return (
        <ul className={s.ul}>
          {b.items.map((it, i) => (
            <li key={i}>
              <Inlines c={it} />
            </li>
          ))}
        </ul>
      );
    case "box":
      return (
        <div className={b.kind === "sit" ? s.sit : s.key}>
          <Blocks blocks={b.c} ctx={ctx} />
        </div>
      );
    case "table":
      return (
        <table className={s.inner}>
          {b.head && (
            <thead>
              <tr>
                {b.head.map((c, i) => (
                  <th key={i}>
                    <Inlines c={c} />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {b.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>
                    <Inlines c={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "img": {
      const src = ctx.imgs[b.n];
      // eslint-disable-next-line @next/next/no-img-element -- شكل مقتطع من المذكرة الأصلية
      return src ? <img className={s.fig} src={`data:image/jpeg;base64,${src}`} alt="" /> : null;
    }
    case "fig": {
      const src = ctx.figSrc?.(b.ref, b.box);
      // eslint-disable-next-line @next/next/no-img-element -- معاينة الشكل قبل النشر
      return src ? <img className={s.fig} src={src} alt="" /> : null;
    }
  }
}

function Inlines({ c }: { c: Inline[] }) {
  return c.map((x, i) => {
    switch (x.t) {
      case "text":
        return x.v;
      case "b":
        return (
          <b key={i}>
            <Inlines c={x.c} />
          </b>
        );
      case "hl":
        return (
          <span key={i} className={s.hl}>
            <Inlines c={x.c} />
          </span>
        );
      case "math":
        return (
          <bdi key={i} dir="ltr" className={s.math}>
            <MathView c={x.c} />
          </bdi>
        );
    }
  });
}

function MathView({ c }: { c: MathNode[] }) {
  return c.map((x, i) => {
    switch (x.t) {
      case "text":
        return x.v;
      case "frac":
        return (
          <span key={i} className={s.frac}>
            <span>
              <MathView c={x.n} />
            </span>
            <span>
              <MathView c={x.d} />
            </span>
          </span>
        );
      case "sqrt":
        return (
          <span key={i} className={s.sqrt}>
            √<span>
              <MathView c={x.c} />
            </span>
          </span>
        );
      case "sup":
        return (
          <sup key={i}>
            <MathView c={x.c} />
          </sup>
        );
      case "sub":
        return (
          <sub key={i}>
            <MathView c={x.c} />
          </sub>
        );
    }
  });
}
