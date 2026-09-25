import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { AuthProvider } from "@/features/auth/auth-provider";
import { RequireAuth } from "@/features/auth/gates";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RequireAuth onboarding>
        <div className="min-h-dvh bg-canvas pt-safe">
          <header className="border-b border-line bg-surface">
            <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
              <Logo variant="lockup" className="h-9" priority />
              <LocaleSwitcher />
            </div>
          </header>
          <main className="mx-auto max-w-xl px-4 pb-8 pt-6">{children}</main>
        </div>
      </RequireAuth>
    </AuthProvider>
  );
}
