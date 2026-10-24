"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef, useState } from "react"

import { streamChat } from "@/lib/api/chat"
import type { Source, StoredMessage } from "@/lib/api/types"
import { describeError, describeErrorCode } from "@/lib/errors"

import { conversationKeys } from "./use-conversations"

export type MessageStatus = "streaming" | "done" | "stopped" | "error"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  status: MessageStatus
  sources?: Source[]
}

function createMessage(
  role: Message["role"],
  content: string,
  status: MessageStatus,
): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    status,
  }
}

export function fromStored(messages: StoredMessage[]): Message[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.created_at,
    status: "done",
    sources: m.sources ?? undefined,
  }))
}

export function useChat(botId: string, model?: string | null) {
  const queryClient = useQueryClient()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  const update = useCallback(
    (id: string, patch: (message: Message) => Partial<Message>) => {
      setMessages((current) =>
        current.map((m) => (m.id === id ? { ...m, ...patch(m) } : m)),
      )
    },
    [],
  )

  const send = useCallback(
    async (content: string) => {
      const text = content.trim()
      if (!text || controllerRef.current) return

      const assistant = createMessage("assistant", "", "streaming")
      setError(null)
      setMessages((current) => [
        ...current,
        createMessage("user", text, "done"),
        assistant,
      ])
      setIsStreaming(true)
      const controller = new AbortController()
      controllerRef.current = controller

      try {
        const stream = streamChat(
          botId,
          { content: text, conversation_id: conversationId, model },
          controller.signal,
        )
        for await (const event of stream) {
          if (event.type === "conversation") setConversationId(event.id)
          else if (event.type === "sources") {
            update(assistant.id, () => ({ sources: event.sources }))
          } else if (event.type === "token") {
            update(assistant.id, (m) => ({ content: m.content + event.text }))
          } else if (event.type === "done")
            update(assistant.id, () => ({ status: "done" }))
          else {
            update(assistant.id, () => ({ status: "error" }))
            setError(describeErrorCode(event.code, event.message))
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          update(assistant.id, () => ({ status: "stopped" }))
        } else {
          setMessages((current) => current.filter((m) => m.id !== assistant.id))
          setError(describeError(err))
        }
      } finally {
        controllerRef.current = null
        setIsStreaming(false)
        void queryClient.invalidateQueries({
          queryKey: conversationKeys.list(botId),
        })
      }
    },
    [botId, conversationId, model, queryClient, update],
  )

  const stop = useCallback(() => controllerRef.current?.abort(), [])

  /** Switches to a stored conversation, or to a blank one when called without arguments. */
  const load = useCallback(
    (id: string | null = null, stored: StoredMessage[] = []) => {
      controllerRef.current?.abort()
      setConversationId(id)
      setMessages(fromStored(stored))
      setError(null)
    },
    [],
  )

  return { conversationId, messages, error, isStreaming, send, stop, load }
}
