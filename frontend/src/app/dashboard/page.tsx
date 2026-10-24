import { ArrowRight, Bot, MessageSquareText } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { SystemStatus } from "@/components/dashboard/system-status"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = { title: "Vue d'ensemble" }

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-8">
      <PageHeader
        title="Vue d'ensemble"
        description="Bienvenue sur Mpanampy."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <MessageSquareText className="size-5" />
            </span>
            <CardTitle>Tester le moteur de conversation</CardTitle>
            <CardDescription>
              Discutez avec l&apos;IA et comparez les modèles avant de connecter
              vos documents.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/dashboard/playground" className={buttonVariants()}>
              Ouvrir le playground
              <ArrowRight data-icon="inline-end" />
            </Link>
          </CardFooter>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Bot className="size-5" />
            </span>
            <CardTitle className="flex items-center gap-2">
              Créer votre premier assistant
              <Badge variant="secondary">Bientôt</Badge>
            </CardTitle>
            <CardDescription>
              Importez votre catalogue et votre FAQ pour obtenir un assistant
              qui répond comme votre meilleur vendeur.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <SystemStatus />
    </div>
  )
}
