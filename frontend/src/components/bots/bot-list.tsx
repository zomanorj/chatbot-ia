"use client"

import { Bot as BotIcon, ChevronRight, Plus } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBots } from "@/hooks/use-bots"
import { describeError } from "@/lib/errors"
import { formatRelative, modelLabel } from "@/lib/format"

import { LanguageBadge } from "./language-badge"

export function EmptyBots() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <BotIcon className="size-6" />
      </span>
      <div className="space-y-1">
        <h2 className="font-medium">Aucun assistant pour le moment</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Créez votre premier assistant et testez-le avant de le présenter à vos
          clients.
        </p>
      </div>
      <Link href="/dashboard/bots/new" className={buttonVariants()}>
        <Plus data-icon="inline-start" />
        Créer un assistant
      </Link>
    </div>
  )
}

export function BotList() {
  const { data: bots, isPending, error } = useBots()

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        title="Assistants"
        description="Chaque assistant a ses propres instructions et conversations."
      >
        <Link href="/dashboard/bots/new" className={buttonVariants()}>
          <Plus data-icon="inline-start" />
          Nouvel assistant
        </Link>
      </PageHeader>

      {error && (
        <p className="text-sm text-destructive">{describeError(error)}</p>
      )}

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((key) => (
            <Skeleton key={key} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : bots?.length === 0 ? (
        <EmptyBots />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {bots?.map((bot) => (
            <li key={bot.id}>
              <Link
                href={`/dashboard/bots/${bot.id}`}
                className="group flex h-full items-start gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <BotIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-medium">{bot.name}</h2>
                    <LanguageBadge language={bot.language} />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {bot.instructions || "Aucune instruction pour le moment."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bot.model ? modelLabel(bot.model) : "Modèle par défaut"} ·
                    modifié {formatRelative(bot.updated_at)}
                  </p>
                </div>
                <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
