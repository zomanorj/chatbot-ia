"use client"

import { ArrowUp, Square } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const MAX_LENGTH = 4000

export function Composer({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: {
  onSend: (content: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = value.trim().length > 0 && !isStreaming && !disabled

  function submit() {
    if (!canSend) return
    onSend(value)
    setValue("")
    textareaRef.current?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-6"
    >
      <div className="rounded-2xl border bg-card shadow-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_LENGTH}
          rows={1}
          placeholder="Écrivez votre message…"
          aria-label="Message"
          className="max-h-48 min-h-12 resize-none border-0 bg-transparent px-4 pt-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
          {value.length > MAX_LENGTH * 0.9 ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {value.length} / {MAX_LENGTH}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground max-sm:invisible">
              <kbd className="font-sans">Entrée</kbd> pour envoyer,{" "}
              <kbd className="font-sans">Maj + Entrée</kbd> pour un saut de
              ligne
            </p>
          )}
          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={onStop}
              aria-label="Arrêter la génération"
            >
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              aria-label="Envoyer"
            >
              <ArrowUp />
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
