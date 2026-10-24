import { parseSSE } from "@/lib/sse"

import { api, ApiError, toApiError } from "./client"
import type { components } from "./schema"

export type ChatMessagePayload = components["schemas"]["ChatMessage"]

export type ChatEvent =
  | { type: "token"; text: string }
  | { type: "done"; model: string }
  | { type: "error"; code: string; message: string }

export async function* streamChat(
  body: { messages: ChatMessagePayload[]; model?: string },
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const { data, error, response } = await api.POST("/api/v1/chat/stream", {
    body,
    signal,
    parseAs: "stream",
  })
  if (error !== undefined || !data) throw toApiError(error, response.status)

  for await (const message of parseSSE(data)) {
    const payload = JSON.parse(message.data)
    if (message.event === "token") yield { type: "token", text: payload.text }
    else if (message.event === "done")
      yield { type: "done", model: payload.model }
    else if (message.event === "error") {
      yield { type: "error", code: payload.code, message: payload.message }
    }
  }
}

export { ApiError }
