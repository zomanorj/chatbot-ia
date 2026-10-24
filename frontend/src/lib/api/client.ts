import createClient from "openapi-fetch"

import { API_URL } from "@/lib/env"

import type { paths } from "./schema"

export const api = createClient<paths>({ baseUrl: API_URL })

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
