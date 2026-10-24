"use client"

import { Check, Copy, FileText } from "lucide-react"
import { useState } from "react"
import { cn } from "cn"

import { LogoMark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Message } from "@/hooks/use-chat"

import { Markdown } from "./markdown"

const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
})

function TypingDots() {
  return (
    <span
      className="flex h-5 items-center gap-1"
      aria-label="L'assistant écrit"
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={copy}
            aria-label="Copier la réponse"
          />
        }
      >
        {copied ? <Check className="text-success" /> : <Copy />}
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copié" : "Copier"}</TooltipContent>
    </Tooltip>
  )
}

export function ChatMessage({ message }: { message: Message }) {
  const time = timeFormat.format(new Date(message.createdAt))

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] space-y-1 sm:max-w-[75%]">
          <p className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm whitespace-pre-wrap text-primary-foreground">
            {message.content}
          </p>
          <time
            dateTime={message.createdAt}
            className="block text-right text-xs text-muted-foreground"
          >
            {time}
          </time>
        </div>
      </div>
    )
  }

  const isStreaming = message.status === "streaming"

  return (
    <div className="group flex gap-3">
      <LogoMark className="mt-0.5 size-7" />
      <div className="min-w-0 flex-1 space-y-1.5">
        {message.content ? (
          <Markdown>{message.content}</Markdown>
        ) : (
          isStreaming && <TypingDots />
        )}
        {!isStreaming && message.sources && message.sources.length > 0 && (
          <ul aria-label="Sources" className="flex flex-wrap gap-1.5 pt-1">
            {message.sources.map((source) => (
              <li
                key={source.document_id}
                className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground"
              >
                <FileText className="size-3.5" />
                {source.title}
              </li>
            ))}
          </ul>
        )}
        <div
          className={cn(
            "flex h-6 items-center gap-2 text-xs text-muted-foreground",
            isStreaming && "invisible",
          )}
        >
          <time dateTime={message.createdAt}>{time}</time>
          {message.status === "stopped" && <span>· Réponse interrompue</span>}
          {message.status === "error" && (
            <span className="text-destructive">· Réponse incomplète</span>
          )}
          {message.content && (
            <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <CopyButton text={message.content} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
