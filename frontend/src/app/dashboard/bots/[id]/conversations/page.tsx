import type { Metadata } from "next"

import { ConversationBrowser } from "@/components/bots/conversation-browser"

export const metadata: Metadata = { title: "Conversations" }

export default function BotConversationsPage() {
  return <ConversationBrowser />
}
