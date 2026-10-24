import { BotShell } from "@/components/bots/bot-shell"

export default function BotLayout({
  children,
}: LayoutProps<"/dashboard/bots/[id]">) {
  return <BotShell>{children}</BotShell>
}
