"use client"

import { useEffect, useRef } from "react"

import type { Message } from "@/hooks/use-chat"

import { ChatMessage } from "./chat-message"

const STICK_THRESHOLD_PX = 80

export function MessageList({
  messages,
  isStreaming,
}: {
  messages: Message[]
  isStreaming: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  useEffect(() => {
    const container = containerRef.current
    if (container && stickToBottom.current)
      container.scrollTop = container.scrollHeight
  }, [messages])

  function onScroll() {
    const container = containerRef.current
    if (!container) return
    const distance =
      container.scrollHeight - container.scrollTop - container.clientHeight
    stickToBottom.current = distance < STICK_THRESHOLD_PX
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="min-h-0 flex-1 overflow-y-auto"
    >
      <div
        role="log"
        aria-live="polite"
        aria-busy={isStreaming}
        className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6"
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>
    </div>
  )
}
