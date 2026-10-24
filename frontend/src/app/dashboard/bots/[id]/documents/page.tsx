import type { Metadata } from "next"

import { DocumentManager } from "@/components/bots/document-manager"

export const metadata: Metadata = { title: "Documents" }

export default function BotDocumentsPage() {
  return <DocumentManager />
}
