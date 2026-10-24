import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, unwrap } from "@/lib/api/client"
import type { Bot, BotCreate, BotUpdate } from "@/lib/api/types"

export const botKeys = {
  all: ["bots"] as const,
  detail: (id: string) => ["bots", id] as const,
}

export function useBots() {
  return useQuery({
    queryKey: botKeys.all,
    queryFn: async () => unwrap(await api.GET("/api/v1/bots")),
  })
}

export function useBot(id: string) {
  return useQuery({
    queryKey: botKeys.detail(id),
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/bots/{bot_id}", {
          params: { path: { bot_id: id } },
        }),
      ),
    retry: false,
  })
}

export function useCreateBot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: BotCreate) =>
      unwrap(await api.POST("/api/v1/bots", { body })),
    onSuccess: (bot) => {
      queryClient.setQueryData(botKeys.detail(bot.id), bot)
      return queryClient.invalidateQueries({
        queryKey: botKeys.all,
        exact: true,
      })
    },
  })
}

export function useUpdateBot(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: BotUpdate) =>
      unwrap(
        await api.PATCH("/api/v1/bots/{bot_id}", {
          params: { path: { bot_id: id } },
          body,
        }),
      ),
    onSuccess: (bot: Bot) => {
      queryClient.setQueryData(botKeys.detail(id), bot)
      return queryClient.invalidateQueries({
        queryKey: botKeys.all,
        exact: true,
      })
    },
  })
}

export function useDeleteBot(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      unwrap(
        await api.DELETE("/api/v1/bots/{bot_id}", {
          params: { path: { bot_id: id } },
        }),
      ),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: botKeys.detail(id) })
      return queryClient.invalidateQueries({
        queryKey: botKeys.all,
        exact: true,
      })
    },
  })
}
