const relative = new Intl.RelativeTimeFormat("fr", { numeric: "auto" })
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
})
const time = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
})

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
]

export function formatRelative(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size)
      return relative.format(Math.round(seconds / size), unit)
  }
  return "à l'instant"
}

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

export function formatTime(iso: string): string {
  return time.format(new Date(iso))
}

export const LANGUAGE_LABELS: Record<string, string> = {
  fr: "Français",
  mg: "Malagasy",
  en: "English",
}

export const MODEL_LABELS: Record<string, { label: string; hint: string }> = {
  "openai/gpt-oss-120b": { label: "GPT-OSS 120B", hint: "Précis" },
  "openai/gpt-oss-20b": { label: "GPT-OSS 20B", hint: "Rapide" },
}

export function modelLabel(model: string): string {
  return MODEL_LABELS[model]?.label ?? model
}
