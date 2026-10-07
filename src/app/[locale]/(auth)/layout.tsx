import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { BeanMoraLogo } from "@/components/layout/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { getLocale } from "next-intl/server";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const ar = (await getLocale()) === "ar";
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <header className="flex items-center justify-between px-4 py-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <BeanMoraLogo className="h-9 w-9" />
          <span className="text-lg font-semibold text-[var(--color-espresso)]">
            BeanMora
          </span>
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <footer className="flex justify-center gap-5 px-4 py-5 text-sm text-[var(--color-teal)]">
        <Link href="/privacy">{ar ? "سياسة الخصوصية" : "Privacy policy"}</Link>
        <Link href="/terms">{ar ? "شروط الاستخدام" : "Terms of use"}</Link>
      </footer>
    </div>
  );
}
