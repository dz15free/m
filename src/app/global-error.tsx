"use client";

/* يحلّ محلّ التخطيط الجذري عند تعطّله، فلا ترجمة ولا أنماط عامة: نص ثنائي اللغة مستقل. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f6f8f7", color: "#16211d" }}>
        <title>مساعد الأستاذ</title>
        <main role="alert" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 360 }}>
            <h1 style={{ fontSize: 22 }}>حدث خطأ غير متوقع</h1>
            <p style={{ color: "#5b6b65" }}>لم تُفقد بياناتك. أعد المحاولة.</p>
            <p dir="ltr" style={{ color: "#5b6b65" }}>Une erreur est survenue. Vos données ne sont pas perdues.</p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ marginTop: 12, minHeight: 44, padding: "0 24px", border: 0, borderRadius: 999, background: "#09715b", color: "#fff", fontWeight: 700, fontSize: 16 }}
            >
              إعادة المحاولة · Réessayer
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
