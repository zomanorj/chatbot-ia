"use client"

import {
  CircleAlert,
  CircleCheck,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  NotebookPen,
  RotateCcw,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react"
import { useRef, useState } from "react"
import { cn } from "cn"

import { FormError } from "@/components/auth/form-error"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useCreateTextDocument,
  useDeleteDocument,
  useDocuments,
  useRetryDocument,
  useUploadDocument,
} from "@/hooks/use-documents"
import type { KnowledgeDocument } from "@/lib/api/types"
import { describeError, describeErrorCode } from "@/lib/errors"
import { formatBytes, formatRelative } from "@/lib/format"

import { useBotId } from "./use-bot-id"

const ACCEPT = ".pdf,.docx,.xlsx,.csv,.txt,.md"

function documentIcon(document: KnowledgeDocument): LucideIcon {
  if (document.kind === "text") return NotebookPen
  if (/sheet|csv/.test(document.content_type)) return FileSpreadsheet
  return FileText
}

function StatusLabel({ document }: { document: KnowledgeDocument }) {
  switch (document.status) {
    case "ready":
      return (
        <span className="flex items-center gap-1.5 text-success">
          <CircleCheck className="size-3.5" />
          {document.chunk_count} passage{document.chunk_count > 1 ? "s" : ""}
        </span>
      )
    case "failed":
      return (
        <span className="flex items-center gap-1.5 text-destructive">
          <CircleAlert className="size-3.5" />
          {describeErrorCode(
            document.error ?? "processing_failed",
            "Échec du traitement",
          )}
        </span>
      )
    default:
      return (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" />
          {document.status === "pending" ? "En attente" : "Indexation en cours"}
        </span>
      )
  }
}

function TextDocumentDialog({ botId }: { botId: string }) {
  const [open, setOpen] = useState(false)
  const createText = useCreateTextDocument(botId)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    createText.mutate(
      {
        title: String(form.get("title")),
        content: String(form.get("content")),
      },
      {
        onSuccess: () => {
          setOpen(false)
          createText.reset()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <NotebookPen data-icon="inline-start" />
        Ajouter un texte
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Ajouter un texte</DialogTitle>
            <DialogDescription>
              Une question fréquente, une politique, une promotion… Rédigez-la
              comme vous l&apos;expliqueriez à un client.
            </DialogDescription>
          </DialogHeader>
          <FormError
            message={createText.error ? describeError(createText.error) : null}
          />
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              name="title"
              className="h-9"
              placeholder="Retours et échanges"
              required
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="content">Contenu</Label>
            <Textarea
              id="content"
              name="content"
              rows={8}
              className="min-h-40"
              placeholder="Les articles peuvent être échangés sous 7 jours avec le ticket de caisse."
              required
              maxLength={50000}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createText.isPending}>
              {createText.isPending ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DropZone({ botId }: { botId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const upload = useUploadDocument(botId)

  async function uploadAll(files: FileList | File[]) {
    setErrors([])
    const failures: string[] = []
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync(file)
      } catch (err) {
        failures.push(`${file.name} : ${describeError(err)}`)
      }
    }
    setErrors(failures)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void uploadAll(event.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-primary bg-accent/50" : "bg-card",
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          {upload.isPending ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <Upload className="size-5" />
          )}
        </span>
        <div className="space-y-1">
          <p className="font-medium">Glissez vos fichiers ici</p>
          <p className="text-sm text-muted-foreground">
            Catalogue, liste de prix, FAQ… PDF, Word, Excel, CSV, TXT ou
            Markdown, 10 Mo maximum.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
          >
            Choisir des fichiers
          </Button>
          <TextDocumentDialog botId={botId} />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files?.length) void uploadAll(event.target.files)
            event.target.value = ""
          }}
        />
      </div>
      {errors.map((message) => (
        <FormError key={message} message={message} />
      ))}
    </div>
  )
}

export function DocumentManager() {
  const botId = useBotId()
  const { data: documents, isPending } = useDocuments(botId)
  const retry = useRetryDocument(botId)
  const remove = useDeleteDocument(botId)

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-8">
      <div className="space-y-1">
        <h2 className="font-medium">Base de connaissances</h2>
        <p className="text-sm text-muted-foreground">
          L&apos;assistant répond à partir de ces documents et cite ses sources.
        </p>
      </div>

      <DropZone botId={botId} />

      {isPending ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : documents?.length ? (
        <ul className="divide-y rounded-xl border bg-card">
          {documents.map((document) => {
            const Icon = documentIcon(document)
            return (
              <li
                key={document.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <Icon className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {document.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs">
                    <StatusLabel document={document} />
                    <span className="text-muted-foreground">
                      · {formatBytes(document.size_bytes)} · ajouté{" "}
                      {formatRelative(document.created_at)}
                    </span>
                  </div>
                </div>
                {document.status === "failed" && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Réessayer"
                          onClick={() => retry.mutate(document.id)}
                        />
                      }
                    >
                      <RotateCcw />
                    </TooltipTrigger>
                    <TooltipContent>Réessayer</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Supprimer ${document.title}`}
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(document.id)}
                      />
                    }
                  >
                    <Trash2 />
                  </TooltipTrigger>
                  <TooltipContent>Supprimer</TooltipContent>
                </Tooltip>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Aucun document pour le moment. Sans documents, l&apos;assistant ne
          connaît que ses instructions.
        </p>
      )}
    </div>
  )
}
