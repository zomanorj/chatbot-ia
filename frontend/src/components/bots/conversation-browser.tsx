"use client"

import { Inbox, Trash2 } from "lucide-react"
import { useState } from "react"

import { MessageList } from "@/components/chat/message-list"
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
import { Skeleton } from "@/components/ui/skeleton"
import { fromStored } from "@/hooks/use-chat"
import {
  useConversation,
  useConversations,
  useDeleteConversation,
} from "@/hooks/use-conversations"
import { formatDateTime } from "@/lib/format"

import { ConversationList } from "./conversation-list"
import { useBotId } from "./use-bot-id"

export function ConversationBrowser() {
  const botId = useBotId()
  const conversations = useConversations(botId)
  const [activeId, setActiveId] = useState<string | null>(null)
  const detail = useConversation(botId, activeId)
  const deleteConversation = useDeleteConversation(botId)

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="max-h-64 shrink-0 overflow-y-auto border-b md:max-h-none md:w-80 md:border-r md:border-b-0">
        <ConversationList
          conversations={conversations.data}
          isPending={conversations.isPending}
          activeId={activeId}
          onSelect={setActiveId}
          showChannel
          emptyLabel="Aucune conversation pour le moment."
        />
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
            <Inbox className="size-8" />
            <p className="text-sm">
              Sélectionnez une conversation pour lire l&apos;échange.
            </p>
          </div>
        ) : detail.isPending ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : detail.data ? (
          <>
            <div className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h2 className="truncate font-medium">{detail.data.title}</h2>
                <p className="text-xs text-muted-foreground">
                  Commencée le {formatDateTime(detail.data.created_at)}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Supprimer la conversation"
                    />
                  }
                >
                  <Trash2 />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Supprimer cette conversation ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Tous les messages seront définitivement effacés.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() =>
                        deleteConversation.mutate(activeId, {
                          onSuccess: () => setActiveId(null),
                        })
                      }
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <MessageList
              messages={fromStored(detail.data.messages)}
              isStreaming={false}
            />
          </>
        ) : null}
      </section>
    </div>
  )
}
