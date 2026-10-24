"use client"

import { useParams } from "next/navigation"

export function useBotId(): string {
  return useParams<{ id: string }>().id
}
