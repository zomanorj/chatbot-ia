import { ApiError } from "@/lib/api/client"

const MESSAGES: Record<string, string> = {
  rate_limited: "Trop de tentatives. Patientez une minute avant de réessayer.",
  llm_not_configured: "Le service d'IA n'est pas configuré sur le serveur.",
  provider_busy:
    "Le service d'IA est très sollicité. Réessayez dans quelques instants.",
  provider_unreachable: "Le service d'IA est momentanément injoignable.",
  provider_error: "Le service d'IA n'a pas pu répondre. Réessayez.",
  validation_error: "Certaines informations sont invalides.",
  unknown_model: "Ce modèle n'est plus disponible.",
  invalid_credentials: "E-mail ou mot de passe incorrect.",
  email_taken: "Un compte existe déjà avec cette adresse e-mail.",
  not_authenticated: "Votre session a expiré. Reconnectez-vous.",
  invalid_session: "Votre session a expiré. Reconnectez-vous.",
  bot_not_found: "Cet assistant n'existe pas ou a été supprimé.",
  conversation_not_found: "Cette conversation n'existe plus.",
  document_not_found: "Ce document n'existe plus.",
  document_limit: "Limite atteinte : 100 documents par assistant.",
  file_too_large: "Le fichier dépasse 10 Mo.",
  empty_file: "Le fichier est vide.",
  unsupported_type:
    "Format non pris en charge. Utilisez PDF, Word, Excel, CSV, TXT ou Markdown.",
  corrupted_file:
    "Le fichier semble endommagé ou ne correspond pas à son extension.",
  encrypted_pdf: "Ce PDF est protégé par un mot de passe.",
  no_text:
    "Aucun texte trouvé. Les documents scannés ne sont pas encore pris en charge.",
  too_much_text:
    "Le document contient trop de texte. Divisez-le en plusieurs fichiers.",
  unreadable_text: "L'encodage du texte n'a pas pu être reconnu.",
  processing_failed:
    "Le traitement a échoué. Réessayez dans quelques instants.",
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
