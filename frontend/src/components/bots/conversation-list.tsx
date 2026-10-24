"use client"

import { MessageSquare } from "lucide-react"
import { cn } from "cn"

import { Skeleton } from "@/components/ui/skeleton"
import type { ConversationSummary } from "@/lib/api/types"
import { formatRelative } from "@/lib/format"

const CHANNEL_LABELS: Record<string, string> = {
  playground: "Test",
  widget: "Site web",
  messenger: "Messenger",
}

export function ConversationList({
  conversations,
  isPending,
  activeId,
  onSelect,
  showChannel = false,
  emptyLabel,
}: {
  conversations?: ConversationSummary[]
  isPending: boolean
  activeId: string | null
  onSelect: (id: string) => void
  showChannel?: boolean
  emptyLabel: string
}) {
  if (isPending) {
    return (
      <div className="space-y-1.5 p-2">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-12 rounded-lg" />
        ))}
      </div>
    )
  }
  if (!conversations?.length) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    )
  }

  return (
    <ul className="space-y-0.5 p-2">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <button
            type="button"
            onClick={() => onSelect(conversation.id)}
            aria-current={conversation.id === activeId ? "true" : undefined}
            className={cn(
              "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
              conversation.id === activeId
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted",
            )}
          >
            <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">
                {conversation.title}
              </span>
              <span className="block text-xs text-muted-foreground">
                {showChannel &&
                  `${CHANNEL_LABELS[conversation.channel] ?? conversation.channel} · `}
                {formatRelative(conversation.updated_at)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
