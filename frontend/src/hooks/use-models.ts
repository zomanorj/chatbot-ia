import { useQuery } from "@tanstack/react-query"

import { api, toApiError } from "@/lib/api/client"

export function useModels() {
  return useQuery({
    queryKey: ["chat", "models"],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/api/v1/chat/models")
      if (!data) throw toApiError(error, response.status)
      return data
    },
    staleTime: Infinity,
  })
}
