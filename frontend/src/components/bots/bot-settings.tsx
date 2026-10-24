"use client"

import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useBot, useDeleteBot, useUpdateBot } from "@/hooks/use-bots"
import { describeError } from "@/lib/errors"

import { BotForm, toFormValues } from "./bot-form"
import { useBotId } from "./use-bot-id"

export function BotSettings() {
  const botId = useBotId()
  const router = useRouter()
  const { data: bot } = useBot(botId)
  const updateBot = useUpdateBot(botId)
  const deleteBot = useDeleteBot(botId)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(timer)
  }, [saved])

  if (!bot) {
    return (
      <div className="mx-auto w-full max-w-3xl p-8">
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Ces informations guident chaque réponse de l&apos;assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BotForm
            key={bot.updated_at}
            initial={toFormValues(bot)}
            error={updateBot.error ? describeError(updateBot.error) : null}
            showModel
            onSubmit={(values) =>
              updateBot.mutate(values, { onSuccess: () => setSaved(true) })
            }
          >
            <div className="flex items-center justify-end gap-3">
              {saved && (
                <span
                  role="status"
                  className="flex items-center gap-1.5 text-sm text-success"
                >
                  <Check className="size-4" />
                  Modifications enregistrées
                </span>
              )}
              <Button type="submit" disabled={updateBot.isPending}>
                {updateBot.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </BotForm>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Supprimer l&apos;assistant</CardTitle>
          <CardDescription>
            L&apos;assistant et toutes ses conversations seront définitivement
            supprimés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Supprimer
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer « {bot.name} » ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={deleteBot.isPending}
                  onClick={() =>
                    deleteBot.mutate(undefined, {
                      onSuccess: () => router.replace("/dashboard/bots"),
                    })
                  }
                >
                  Supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
