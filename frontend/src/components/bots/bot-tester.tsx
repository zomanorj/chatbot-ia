"use client"

import { useQueryClient } from "@tanstack/react-query"
import { CircleAlert, History, Plus } from "lucide-react"
import { useState } from "react"

import { LogoMark } from "@/components/brand/logo"
import { Composer } from "@/components/chat/composer"
import { MessageList } from "@/components/chat/message-list"
import { ModelSelect } from "@/components/chat/model-select"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useBot } from "@/hooks/use-bots"
import { useChat } from "@/hooks/use-chat"
import { conversationKeys, useConversations } from "@/hooks/use-conversations"
import { useModels } from "@/hooks/use-models"
import { api, unwrap } from "@/lib/api/client"
import { describeError } from "@/lib/errors"

import { ConversationList } from "./conversation-list"
import { useBotId } from "./use-bot-id"

const SUGGESTIONS = [
  "Quels sont vos horaires d'ouverture ?",
  "Inona no azonao atao hanampiana ahy?",
  "Do you deliver outside Antananarivo?",
]

function EmptyState({
  welcome,
  onPick,
}: {
  welcome?: string
  onPick: (text: string) => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <LogoMark className="size-11" />
      <div className="max-w-md space-y-1.5">
        <h2 className="text-lg font-medium text-balance">
          {welcome || "Comment puis-je vous aider ?"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Mettez-vous à la place d&apos;un client et testez les réponses de
          votre assistant.
        </p>
      </div>
      <ul className="grid w-full max-w-2xl gap-2 sm:grid-cols-3">
        {SUGGESTIONS.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              onClick={() => onPick(suggestion)}
              className="h-full w-full rounded-xl border bg-card p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BotTester() {
  const botId = useBotId()
  const queryClient = useQueryClient()
  const { data: bot } = useBot(botId)
  const models = useModels()
  const conversations = useConversations(botId)
  const [selected, setSelected] = useState<string>()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const model = selected ?? bot?.model ?? models.data?.default
  const chat = useChat(botId, model)
  const playground = conversations.data?.filter(
    (c) => c.channel === "playground",
  )

  async function openConversation(id: string) {
    setHistoryOpen(false)
    setLoadError(null)
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: conversationKeys.detail(botId, id),
        queryFn: async () =>
          unwrap(
            await api.GET(
              "/api/v1/bots/{bot_id}/conversations/{conversation_id}",
              {
                params: { path: { bot_id: botId, conversation_id: id } },
              },
            ),
          ),
        staleTime: 0,
      })
      chat.load(detail.id, detail.messages)
    } catch (err) {
      setLoadError(describeError(err))
    }
  }

  const history = (
    <ConversationList
      conversations={playground}
      isPending={conversations.isPending}
      activeId={chat.conversationId}
      onSelect={openConversation}
      emptyLabel="Vos conversations de test apparaîtront ici."
    />
  )
  const error = chat.error ?? loadError

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-r lg:flex">
        <p className="px-4 pt-4 pb-1 text-xs font-medium text-muted-foreground">
          Historique
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto">{history}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  aria-label="Historique"
                />
              }
            >
              <History data-icon="inline-start" />
              Historique
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="px-4 pt-4 text-sm">Historique</SheetTitle>
              <div className="overflow-y-auto">{history}</div>
            </SheetContent>
          </Sheet>
          <div className="ml-auto flex items-center gap-2">
            <ModelSelect
              models={models.data?.models}
              value={model}
              onChange={setSelected}
              disabled={chat.isStreaming}
            />
            <Button
              variant="outline"
              onClick={() => chat.load()}
              disabled={chat.messages.length === 0}
              aria-label="Nouvelle conversation"
            >
              <Plus data-icon="inline-start" />
              <span className="hidden sm:inline">Nouvelle conversation</span>
            </Button>
          </div>
        </div>

        {chat.messages.length === 0 ? (
          <EmptyState welcome={bot?.welcome_message} onPick={chat.send} />
        ) : (
          <MessageList
            messages={chat.messages}
            isStreaming={chat.isStreaming}
          />
        )}

        {error && (
          <div className="mx-auto w-full max-w-3xl px-4 pb-3 sm:px-6">
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          </div>
        )}

        <Composer
          onSend={chat.send}
          onStop={chat.stop}
          isStreaming={chat.isStreaming}
          disabled={!model}
        />
      </div>
    </div>
  )
}
