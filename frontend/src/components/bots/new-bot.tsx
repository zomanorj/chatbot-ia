"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { PageHeader } from "@/components/dashboard/page-header"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCreateBot } from "@/hooks/use-bots"
import { describeError } from "@/lib/errors"

import { BotForm, toFormValues } from "./bot-form"

export function NewBot() {
  const router = useRouter()
  const createBot = useCreateBot()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-8">
      <Link
        href="/dashboard/bots"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "-ml-2",
        })}
      >
        <ArrowLeft data-icon="inline-start" />
        Assistants
      </Link>
      <PageHeader
        title="Nouvel assistant"
        description="Vous pourrez modifier ces informations à tout moment."
      />
      <Card>
        <CardContent>
          <BotForm
            initial={toFormValues()}
            error={createBot.error ? describeError(createBot.error) : null}
            onSubmit={(values) =>
              createBot.mutate(values, {
                onSuccess: (bot) => router.push(`/dashboard/bots/${bot.id}`),
              })
            }
          >
            <div className="flex justify-end gap-2">
              <Link
                href="/dashboard/bots"
                className={buttonVariants({ variant: "outline" })}
              >
                Annuler
              </Link>
              <Button type="submit" disabled={createBot.isPending}>
                {createBot.isPending ? "Création…" : "Créer l'assistant"}
              </Button>
            </div>
          </BotForm>
        </CardContent>
      </Card>
    </div>
  )
}
