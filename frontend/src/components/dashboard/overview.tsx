"use client"

import { ArrowRight, Bot as BotIcon, Plus } from "lucide-react"
import Link from "next/link"

import { useAuth } from "@/components/auth/auth-provider"
import { EmptyBots } from "@/components/bots/bot-list"
import { LanguageBadge } from "@/components/bots/language-badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useBots } from "@/hooks/use-bots"
import { formatRelative } from "@/lib/format"

import { PageHeader } from "./page-header"
import { SystemStatus } from "./system-status"

const RECENT_COUNT = 4

export function Overview() {
  const { me } = useAuth()
  const { data: bots, isPending } = useBots()
  const firstName = me?.user.full_name.split(/\s+/)[0]

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        title={`Bonjour${firstName ? `, ${firstName}` : ""}`}
        description={me?.organizations[0]?.name}
      >
        <Link href="/dashboard/bots/new" className={buttonVariants()}>
          <Plus data-icon="inline-start" />
          Nouvel assistant
        </Link>
      </PageHeader>

      {isPending ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : bots?.length === 0 ? (
        <EmptyBots />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Vos assistants</CardTitle>
            <Link
              href="/dashboard/bots"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Tout voir
              <ArrowRight data-icon="inline-end" />
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {bots?.slice(0, RECENT_COUNT).map((bot) => (
                <li key={bot.id}>
                  <Link
                    href={`/dashboard/bots/${bot.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted"
                  >
                    <BotIcon className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-medium">
                      {bot.name}
                    </span>
                    <LanguageBadge language={bot.language} />
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {formatRelative(bot.updated_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <SystemStatus />
    </div>
  )
}
