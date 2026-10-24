"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, use, useCallback, useMemo } from "react"

import { api, unwrap } from "@/lib/api/client"
import type { Me, RegisterPayload } from "@/lib/api/types"
import {
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "@/lib/auth/session"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

interface AuthContextValue {
  status: AuthStatus
  me: Me | null
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const ME_KEY = ["auth", "me"] as const

async function fetchMe(): Promise<Me | null> {
  // On first load the access token is gone: restore it from the refresh cookie.
  if (!getAccessToken() && !(await refreshAccessToken())) return null
  const result = await api.GET("/api/v1/auth/me")
  return result.response.ok ? (result.data ?? null) : null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { data: me, isPending } = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
    retry: false,
  })

  const startSession = useCallback(
    async (accessToken: string) => {
      setAccessToken(accessToken)
      await queryClient.fetchQuery({ queryKey: ME_KEY, queryFn: fetchMe })
    },
    [queryClient],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = unwrap(
        await api.POST("/api/v1/auth/login", { body: { email, password } }),
      )
      await startSession(tokens.access_token)
    },
    [startSession],
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const tokens = unwrap(
        await api.POST("/api/v1/auth/register", { body: payload }),
      )
      await startSession(tokens.access_token)
    },
    [startSession],
  )

  const logout = useCallback(async () => {
    await api.POST("/api/v1/auth/logout").catch(() => undefined)
    setAccessToken(null)
    await queryClient.cancelQueries()
    // Update "me" in place: clear() would detach the mounted observer from the cache.
    queryClient.setQueryData(ME_KEY, null)
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== ME_KEY[0],
    })
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      status: isPending ? "loading" : me ? "authenticated" : "unauthenticated",
      me: me ?? null,
      login,
      register,
      logout,
    }),
    [isPending, me, login, register, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>")
  return context
}
