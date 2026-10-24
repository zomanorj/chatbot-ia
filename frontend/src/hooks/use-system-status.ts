import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"

export type ComponentStatus = components["schemas"]["Readiness"]["status"]
export type SystemStatus = Partial<Record<string, ComponentStatus>>

export function useSystemStatus() {
  return useQuery({
    queryKey: ["health", "ready"],
    queryFn: async (): Promise<SystemStatus> => {
      try {
        // A degraded backend answers 503 with the same body shape.
        const { data, error } = await api.GET("/api/v1/health/ready")
        const body =
          data ?? (error as components["schemas"]["Readiness"] | undefined)
        return { api: "ok", ...body?.checks }
      } catch {
        return { api: "error" }
      }
    },
    refetchInterval: 30_000,
  })
}
