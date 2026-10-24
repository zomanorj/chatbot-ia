import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, unwrap } from "@/lib/api/client"

export const conversationKeys = {
  list: (botId: string) => ["bots", botId, "conversations"] as const,
  detail: (botId: string, id: string) =>
    ["bots", botId, "conversations", id] as const,
}

export function useConversations(botId: string) {
  return useQuery({
    queryKey: conversationKeys.list(botId),
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/bots/{bot_id}/conversations", {
          params: { path: { bot_id: botId } },
        }),
      ),
  })
}

export function useConversation(botId: string, id: string | null) {
  return useQuery({
    queryKey: conversationKeys.detail(botId, id ?? ""),
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/bots/{bot_id}/conversations/{conversation_id}", {
          params: { path: { bot_id: botId, conversation_id: id! } },
        }),
      ),
    enabled: id !== null,
  })
}

export function useDeleteConversation(botId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await api.DELETE(
          "/api/v1/bots/{bot_id}/conversations/{conversation_id}",
          {
            params: { path: { bot_id: botId, conversation_id: id } },
          },
        ),
      ),
    onSuccess: (_, id) => {
      queryClient.removeQueries({
        queryKey: conversationKeys.detail(botId, id),
      })
      return queryClient.invalidateQueries({
        queryKey: conversationKeys.list(botId),
      })
    },
  })
}
