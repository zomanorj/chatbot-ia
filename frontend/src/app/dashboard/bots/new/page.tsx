import type { Metadata } from "next"

import { NewBot } from "@/components/bots/new-bot"

export const metadata: Metadata = { title: "Nouvel assistant" }

export default function NewBotPage() {
  return <NewBot />
}
