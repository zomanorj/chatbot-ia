import { Badge } from "@/components/ui/badge"
import { LANGUAGE_LABELS } from "@/lib/format"

export function LanguageBadge({ language }: { language: string }) {
  return (
    <Badge variant="secondary">{LANGUAGE_LABELS[language] ?? language}</Badge>
  )
}
