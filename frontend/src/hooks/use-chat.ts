"use client"

import { useCallback, useRef, useState } from "react"

import { streamChat } from "@/lib/api/chat"
import { describeError, describeErrorCode } from "@/lib/errors"

export type MessageStatus = "streaming" | "done" | "stopped" | "error"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  status: MessageStatus
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

export function useChat(model?: string) {
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

      const user = createMessage("user", text, "done")
      const assistant = createMessage("assistant", "", "streaming")
      // Only completed turns are sent back as context.
      const history = messages
        .filter((m) => m.content && m.status !== "error")
        .map(({ role, content }) => ({ role, content }))

      setError(null)
      setMessages((current) => [...current, user, assistant])
      setIsStreaming(true)
      const controller = new AbortController()
      controllerRef.current = controller

      try {
        const stream = streamChat(
          { messages: [...history, { role: "user", content: text }], model },
          controller.signal,
        )
        for await (const event of stream) {
          if (event.type === "token") {
            update(assistant.id, (m) => ({ content: m.content + event.text }))
          } else if (event.type === "done") {
            update(assistant.id, () => ({ status: "done" }))
          } else {
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
      }
    },
    [messages, model, update],
  )

  const stop = useCallback(() => controllerRef.current?.abort(), [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    setMessages([])
    setError(null)
  }, [])

  return { messages, error, isStreaming, send, stop, reset }
}
