"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { MODEL_LABELS, modelLabel } from "@/lib/format"

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
    label: modelLabel(model),
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
        {models.map((model) => (
          <SelectItem key={model} value={model}>
            {modelLabel(model)}
            {MODEL_LABELS[model] && (
              <span className="ml-auto text-xs text-muted-foreground">
                {MODEL_LABELS[model].hint}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
