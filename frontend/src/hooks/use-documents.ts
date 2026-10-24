import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, unwrap } from "@/lib/api/client"
import type { KnowledgeDocument } from "@/lib/api/types"

const POLL_MS = 2000

export const documentKeys = {
  list: (botId: string) => ["bots", botId, "documents"] as const,
}

function isIndexing(documents?: KnowledgeDocument[]): boolean {
  return !!documents?.some(
    (d) => d.status === "pending" || d.status === "processing",
  )
}

export function useDocuments(botId: string) {
  return useQuery({
    queryKey: documentKeys.list(botId),
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/bots/{bot_id}/documents", {
          params: { path: { bot_id: botId } },
        }),
      ),
    // Poll only while the worker still has documents to index.
    refetchInterval: (query) =>
      isIndexing(query.state.data) ? POLL_MS : false,
  })
}

function useInvalidateDocuments(botId: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: documentKeys.list(botId) })
}

export function useUploadDocument(botId: string) {
  const invalidate = useInvalidateDocuments(botId)
  return useMutation({
    mutationFn: async (file: File) =>
      unwrap(
        await api.POST("/api/v1/bots/{bot_id}/documents", {
          params: { path: { bot_id: botId } },
          // The generated type describes the binary part as a string; the real value is a File.
          body: { file: file as unknown as string },
          bodySerializer: (body) => {
            const form = new FormData()
            form.append("file", body.file as unknown as File)
            return form
          },
        }),
      ),
    onSettled: invalidate,
  })
}

export function useCreateTextDocument(botId: string) {
  const invalidate = useInvalidateDocuments(botId)
  return useMutation({
    mutationFn: async (body: { title: string; content: string }) =>
      unwrap(
        await api.POST("/api/v1/bots/{bot_id}/documents/text", {
          params: { path: { bot_id: botId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useRetryDocument(botId: string) {
  const invalidate = useInvalidateDocuments(botId)
  return useMutation({
    mutationFn: async (documentId: string) =>
      unwrap(
        await api.POST("/api/v1/bots/{bot_id}/documents/{document_id}/retry", {
          params: { path: { bot_id: botId, document_id: documentId } },
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteDocument(botId: string) {
  const invalidate = useInvalidateDocuments(botId)
  return useMutation({
    mutationFn: async (documentId: string) =>
      unwrap(
        await api.DELETE("/api/v1/bots/{bot_id}/documents/{document_id}", {
          params: { path: { bot_id: botId, document_id: documentId } },
        }),
      ),
    onSuccess: invalidate,
  })
}
