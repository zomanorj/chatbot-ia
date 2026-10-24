import { ApiError } from "@/lib/api/client"

const MESSAGES: Record<string, string> = {
  rate_limited:
    "Trop de messages envoyés. Patientez une minute avant de réessayer.",
  llm_not_configured: "Le service d'IA n'est pas configuré sur le serveur.",
  provider_busy:
    "Le service d'IA est très sollicité. Réessayez dans quelques instants.",
  provider_unreachable: "Le service d'IA est momentanément injoignable.",
  provider_error: "Le service d'IA n'a pas pu répondre. Réessayez.",
  validation_error: "Le message est invalide ou trop long.",
  unknown_model: "Ce modèle n'est plus disponible.",
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) return MESSAGES[error.code] ?? error.message
  if (error instanceof TypeError)
    return "Impossible de joindre le serveur. Vérifiez votre connexion."
  return "Une erreur inattendue est survenue."
}

export function describeErrorCode(code: string, fallback: string): string {
  return MESSAGES[code] ?? fallback
}
