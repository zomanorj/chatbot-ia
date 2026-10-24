import { parseSSE } from "@/lib/sse"

import { api, toApiError } from "./client"

export type ChatEvent =
  | { type: "conversation"; id: string; title: string }
  | { type: "token"; text: string }
  | { type: "done"; model: string; messageId: string | null }
  | { type: "error"; code: string; message: string }

export async function* streamChat(
  botId: string,
  body: {
    content: string
    conversation_id?: string | null
    model?: string | null
  },
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const { data, error, response } = await api.POST(
    "/api/v1/bots/{bot_id}/chat",
    {
      params: { path: { bot_id: botId } },
      body,
      signal,
      parseAs: "stream",
    },
  )
  if (error !== undefined || !data) throw toApiError(error, response.status)

  for await (const message of parseSSE(data)) {
    const payload = JSON.parse(message.data)
    switch (message.event) {
      case "conversation":
        yield { type: "conversation", id: payload.id, title: payload.title }
        break
      case "token":
        yield { type: "token", text: payload.text }
        break
      case "done":
        yield {
          type: "done",
          model: payload.model,
          messageId: payload.message_id,
        }
        break
      case "error":
        yield { type: "error", code: payload.code, message: payload.message }
        break
    }
  }
}
