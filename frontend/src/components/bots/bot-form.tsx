"use client"

import { useState } from "react"

import { FormError } from "@/components/auth/form-error"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useModels } from "@/hooks/use-models"
import type { Bot, BotCreate, Language } from "@/lib/api/types"
import { LANGUAGE_LABELS, modelLabel } from "@/lib/format"

const DEFAULT_MODEL = "__default"
const INSTRUCTIONS_MAX = 4000

export type BotFormValues = Required<
  Pick<BotCreate, "name" | "instructions" | "language" | "welcome_message">
> & {
  model: string | null
}

export function toFormValues(bot?: Bot): BotFormValues {
  return {
    name: bot?.name ?? "",
    instructions: bot?.instructions ?? "",
    language: bot?.language ?? "fr",
    welcome_message: bot?.welcome_message ?? "",
    model: bot?.model ?? null,
  }
}

const languageItems = Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export function BotForm({
  initial,
  error,
  showModel = false,
  onSubmit,
  children,
}: {
  initial: BotFormValues
  error: string | null
  showModel?: boolean
  onSubmit: (values: BotFormValues) => void
  children: React.ReactNode
}) {
  const [values, setValues] = useState(initial)
  const models = useModels()
  const set = <K extends keyof BotFormValues>(
    key: K,
    value: BotFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }))

  const modelItems = [
    {
      value: DEFAULT_MODEL,
      label: `Par défaut${models.data ? ` (${modelLabel(models.data.default)})` : ""}`,
    },
    ...(models.data?.models ?? []).map((model) => ({
      value: model,
      label: modelLabel(model),
    })),
  ]

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(values)
      }}
      className="space-y-6"
    >
      <FormError message={error} />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nom de l&apos;assistant</Label>
          <Input
            id="name"
            className="h-9"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="Vendeur Ravaka"
            required
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="language">Langue par défaut</Label>
          <Select
            items={languageItems}
            value={values.language}
            onValueChange={(value) =>
              value && set("language", value as Language)
            }
          >
            <SelectTrigger id="language" className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            L&apos;assistant répond toujours dans la langue du client.
          </p>
        </div>
      </div>

      {showModel && (
        <div className="space-y-1.5">
          <Label htmlFor="model">Modèle</Label>
          <Select
            items={modelItems}
            value={values.model ?? DEFAULT_MODEL}
            onValueChange={(value) =>
              set("model", !value || value === DEFAULT_MODEL ? null : value)
            }
          >
            <SelectTrigger id="model" className="h-9 w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="welcome_message">Message d&apos;accueil</Label>
        <Input
          id="welcome_message"
          className="h-9"
          value={values.welcome_message}
          onChange={(event) => set("welcome_message", event.target.value)}
          placeholder="Salama ! Comment puis-je vous aider ?"
          maxLength={300}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="instructions">Instructions</Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {values.instructions.length} / {INSTRUCTIONS_MAX}
          </span>
        </div>
        <Textarea
          id="instructions"
          value={values.instructions}
          onChange={(event) => set("instructions", event.target.value)}
          maxLength={INSTRUCTIONS_MAX}
          rows={6}
          className="min-h-36"
          placeholder={
            "Ex. : Boutique de vêtements à Antananarivo. Ouverte du lundi au samedi, 8h-18h. Livraison gratuite à Tana dès 50 000 Ar. Paiement MVola ou Orange Money."
          }
        />
        <p className="text-xs text-muted-foreground">
          Décrivez votre commerce, vos horaires, vos conditions de livraison et
          le ton à adopter.
        </p>
      </div>

      {children}
    </form>
  )
}
