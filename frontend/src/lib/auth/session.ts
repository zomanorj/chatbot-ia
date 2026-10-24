import { API_URL } from "@/lib/env"

/**
 * The access token lives in memory only; the refresh token is an httpOnly cookie
 * scoped to /api/v1/auth, so scripts can never read either from storage.
 */
let accessToken: string | null = null
let inflightRefresh: Promise<string | null> | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

async function requestNewToken(): Promise<string | null> {
  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
  if (!response.ok) return null
  const body: { access_token: string } = await response.json()
  return body.access_token
}

/**
 * Refresh tokens are single-use, so refreshes are serialized: within the tab by
 * sharing one promise, across tabs with the Web Locks API.
 */
export function refreshAccessToken(): Promise<string | null> {
  inflightRefresh ??= (async () => {
    try {
      const token =
        typeof navigator !== "undefined" && navigator.locks
          ? await navigator.locks.request(
              "mpanampy-auth-refresh",
              requestNewToken,
            )
          : await requestNewToken()
      setAccessToken(token)
      return token
    } catch {
      setAccessToken(null)
      return null
    } finally {
      inflightRefresh = null
    }
  })()
  return inflightRefresh
}
