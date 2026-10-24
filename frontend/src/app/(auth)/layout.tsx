import Link from "next/link"

import { RedirectIfAuthenticated } from "@/components/auth/auth-guards"
import { Logo } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <RedirectIfAuthenticated>
      <div className="relative flex min-h-svh flex-col bg-muted/40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-2xl rounded-full bg-primary/10 blur-3xl"
        />
        <header className="flex h-14 items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Accueil Mpanampy">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </RedirectIfAuthenticated>
  )
}
