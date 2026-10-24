import type { Metadata } from "next"

import { BotSettings } from "@/components/bots/bot-settings"

export const metadata: Metadata = { title: "Réglages" }

export default function BotSettingsPage() {
  return <BotSettings />
}
