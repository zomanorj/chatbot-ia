"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const MODEL_LABELS: Record<string, { label: string; hint: string }> = {
  "openai/gpt-oss-120b": { label: "GPT-OSS 120B", hint: "Précis" },
  "openai/gpt-oss-20b": { label: "GPT-OSS 20B", hint: "Rapide" },
}

function describe(model: string) {
  return MODEL_LABELS[model] ?? { label: model, hint: "" }
}

export function ModelSelect({
  models,
  value,
  onChange,
  disabled,
}: {
  models?: string[]
  value?: string
  onChange: (model: string) => void
  disabled?: boolean
}) {
  if (!models || !value) return <Skeleton className="h-8 w-40" />

  const items = models.map((model) => ({
    value: model,
    label: describe(model).label,
  }))

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => next && onChange(next)}
      disabled={disabled}
    >
      <SelectTrigger aria-label="Modèle" className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => {
          const { label, hint } = describe(model)
          return (
            <SelectItem key={model} value={model}>
              {label}
              {hint && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {hint}
                </span>
              )}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
