import { getTranslations } from "next-intl/server";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Sidebar } from "@/components/layout/sidebar";
import { QueryProvider } from "@/components/query-provider";
import { AuthProvider } from "@/features/auth/auth-provider";
import { RequireAuth } from "@/features/auth/gates";
import { VerifyEmailBanner } from "@/features/auth/account";

/* مساحة الأستاذ: لا تُعرض إلا بعد تسجيل الدخول.
   الحماية الحقيقية للبيانات في قواعد Firestore والخادم، لا في هذا التخطيط. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("common");

  return (
    <AuthProvider>
      <QueryProvider>
        <RequireAuth>
          <div className="flex min-h-dvh">
            <a
              href="#content"
              className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
            >
              {t("skipToContent")}
            </a>
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileHeader />
              {/* مسافة سفلية تكفي الشريط السفلي والزرّ البارز على الهاتف */}
              <main
                id="content"
                className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10 print:max-w-none print:p-0"
              >
                <VerifyEmailBanner />
                {children}
              </main>
            </div>
            <BottomNav />
          </div>
        </RequireAuth>
      </QueryProvider>
    </AuthProvider>
  );
}
