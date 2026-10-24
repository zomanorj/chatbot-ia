import type { Metadata } from "next"

import { BotList } from "@/components/bots/bot-list"

export const metadata: Metadata = { title: "Assistants" }

export default function BotsPage() {
  return <BotList />
}
