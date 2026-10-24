"use client"

import {
  ArrowLeft,
  FileText,
  MessagesSquare,
  Settings2,
  SquareTerminal,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBot } from "@/hooks/use-bots"
import { describeError } from "@/lib/errors"

import { LanguageBadge } from "./language-badge"
import { useBotId } from "./use-bot-id"

interface Tab {
  segment: string
  label: string
  icon: LucideIcon
}

const TABS: Tab[] = [
  { segment: "", label: "Tester", icon: SquareTerminal },
  { segment: "/documents", label: "Documents", icon: FileText },
  { segment: "/conversations", label: "Conversations", icon: MessagesSquare },
  { segment: "/settings", label: "Réglages", icon: Settings2 },
]

export function BotShell({ children }: { children: React.ReactNode }) {
  const id = useBotId()
  const pathname = usePathname()
  const { data: bot, error } = useBot(id)
  const base = `/dashboard/bots/${id}`

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">{describeError(error)}</p>
        <Link
          href="/dashboard/bots"
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft data-icon="inline-start" />
          Retour aux assistants
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-4 pt-5 sm:px-8">
        <Link
          href="/dashboard/bots"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Assistants
        </Link>
        <div className="mt-1.5 flex items-center gap-2.5">
          {bot ? (
            <>
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {bot.name}
              </h1>
              <LanguageBadge language={bot.language} />
            </>
          ) : (
            <Skeleton className="h-7 w-48" />
          )}
        </div>
        <nav
          aria-label="Sections de l'assistant"
          className="mt-4 -mb-px flex gap-1 overflow-x-auto"
        >
          {TABS.map(({ segment, label, icon: Icon }) => {
            const href = base + segment
            const active = pathname === href
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
      {children}
    </div>
  )
}
