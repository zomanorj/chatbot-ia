"use client"

import { CircleAlert, RotateCcw } from "lucide-react"
import { useState } from "react"

import { LogoMark } from "@/components/brand/logo"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { useChat } from "@/hooks/use-chat"
import { useModels } from "@/hooks/use-models"
import { describeError } from "@/lib/errors"

import { Composer } from "./composer"
import { MessageList } from "./message-list"
import { ModelSelect } from "./model-select"

const SUGGESTIONS = [
  "Rédige une réponse polie pour un client qui demande les délais de livraison.",
  "Inona no azonao atao hanampiana ny fivarotako?",
  "Write a short welcome message for a clothing shop's Facebook page.",
]

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <LogoMark className="size-11" />
      <div className="space-y-1.5">
        <h2 className="text-lg font-medium">Comment puis-je vous aider ?</h2>
        <p className="text-sm text-muted-foreground">
          Posez une question en français, en malgache ou en anglais.
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

export function Playground() {
  const models = useModels()
  const [selected, setSelected] = useState<string>()
  const model = selected ?? models.data?.default
  const { messages, error, isStreaming, send, stop, reset } = useChat(model)
  const blockingError = models.error ? describeError(models.error) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-4 py-4 sm:px-8">
        <PageHeader
          title="Playground"
          description="Testez le moteur de conversation de Mpanampy."
        >
          <ModelSelect
            models={models.data?.models}
            value={model}
            onChange={setSelected}
            disabled={isStreaming}
          />
          <Button
            variant="outline"
            onClick={reset}
            disabled={messages.length === 0}
            aria-label="Nouvelle conversation"
          >
            <RotateCcw data-icon="inline-start" />
            <span className="hidden sm:inline">Nouvelle conversation</span>
          </Button>
        </PageHeader>
      </div>

      {messages.length === 0 ? (
        <EmptyState onPick={send} />
      ) : (
        <MessageList messages={messages} isStreaming={isStreaming} />
      )}

      {(error ?? blockingError) && (
        <div className="mx-auto w-full max-w-3xl px-4 pb-3 sm:px-6">
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {error ?? blockingError}
          </p>
        </div>
      )}

      <Composer
        onSend={send}
        onStop={stop}
        isStreaming={isStreaming}
        disabled={!model}
      />
    </div>
  )
}
