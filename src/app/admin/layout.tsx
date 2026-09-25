import { getTranslations } from "next-intl/server";
import { QueryProvider } from "@/components/query-provider";
import { AuthProvider } from "@/features/auth/auth-provider";
import { RequireAuth } from "@/features/auth/gates";
import { AdminShell } from "@/features/admin/admin-shell";

export async function generateMetadata() {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false } };
}

/* لوحة الإدارة: الحماية الحقيقية في قواعد Firestore والخادم (Custom claims)؛
   هذا الغلاف للعرض فقط ويخفي ما لا يملك المستخدم صلاحيته. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <QueryProvider>
        <RequireAuth>
          <AdminShell>{children}</AdminShell>
        </RequireAuth>
      </QueryProvider>
    </AuthProvider>
  );
}
