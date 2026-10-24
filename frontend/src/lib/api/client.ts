import createClient from "openapi-fetch"

import { getAccessToken, refreshAccessToken } from "@/lib/auth/session"
import { API_URL } from "@/lib/env"

import type { paths } from "./schema"

const AUTH_PATH = "/api/v1/auth/"

function withToken(request: Request, token: string | null): Request {
  const next = new Request(request)
  if (token) next.headers.set("Authorization", `Bearer ${token}`)
  return next
}

/** Adds the bearer token and retries once with a fresh token on 401. */
async function authFetch(request: Request): Promise<Response> {
  const retry = request.clone()
  const response = await fetch(withToken(request, getAccessToken()))
  if (
    response.status !== 401 ||
    new URL(request.url).pathname.startsWith(AUTH_PATH)
  ) {
    return response
  }
  const token = await refreshAccessToken()
  return token ? fetch(withToken(retry, token)) : response
}

export const api = createClient<paths>({
  baseUrl: API_URL,
  credentials: "include",
  fetch: authFetch,
})

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string }
}

export function toApiError(body: unknown, status?: number): ApiError {
  const envelope = (body ?? {}) as ErrorEnvelope
  return new ApiError(
    envelope.error?.code ?? "http_error",
    envelope.error?.message ?? "Request failed.",
    status,
  )
}

/** Returns the payload of an openapi-fetch result, or throws an ApiError. */
export function unwrap<T>(result: {
  data?: T
  error?: unknown
  response: Response
}): T {
  if (result.error !== undefined || !result.response.ok) {
    throw toApiError(result.error, result.response.status)
  }
  return result.data as T
}
