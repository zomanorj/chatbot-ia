"use client"

import {
  Bot,
  ChartColumn,
  FileText,
  LayoutDashboard,
  Menu,
  Users,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "cn"

import { Logo } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { UserMenu } from "./user-menu"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Vue d'ensemble",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/dashboard/bots", label: "Assistants", icon: Bot },
]

const UPCOMING: Omit<NavItem, "href">[] = [
  { label: "Documents", icon: FileText },
  { label: "Prospects", icon: Users },
  { label: "Statistiques", icon: ChartColumn },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col gap-6 p-3">
      <Link href="/dashboard" onClick={onNavigate} className="px-2 pt-1.5">
        <Logo />
      </Link>

      <nav
        aria-label="Navigation principale"
        className="flex flex-1 flex-col gap-6"
      >
        <ul className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="space-y-1">
          <p className="px-2.5 text-xs font-medium text-muted-foreground">
            Bientôt disponible
          </p>
          <ul className="space-y-0.5">
            {UPCOMING.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted-foreground/60"
              >
                <Icon className="size-4" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="flex items-center gap-1 border-t pt-3">
        <UserMenu />
        <ThemeToggle />
      </div>
    </div>
  )
}

export function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:block">
      <SidebarContent />
    </aside>
  )
}

export function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Ouvrir le menu" />
          }
        >
          <Menu />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <Logo />
    </header>
  )
}
