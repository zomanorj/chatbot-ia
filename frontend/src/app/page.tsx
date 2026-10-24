import {
  ArrowRight,
  ChartColumn,
  FileText,
  Headset,
  Languages,
  MessageCircle,
  UserPlus,
} from "lucide-react"
import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { HeroPreview } from "@/components/landing/hero-preview"
import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"

const FEATURES = [
  {
    icon: FileText,
    title: "Vos documents, sa mémoire",
    description:
      "Importez catalogues, tarifs et FAQ. L'assistant répond uniquement à partir de vos informations et cite ses sources.",
  },
  {
    icon: Languages,
    title: "Français, malgache, anglais",
    description:
      "Il répond dans la langue de votre client, sans configuration supplémentaire.",
  },
  {
    icon: MessageCircle,
    title: "Site web et Messenger",
    description:
      "Une ligne de code pour votre site, une connexion pour votre page Facebook. Vos clients restent là où ils sont.",
  },
  {
    icon: UserPlus,
    title: "Capture de prospects",
    description:
      "Les numéros et adresses e-mail laissés en conversation sont enregistrés automatiquement.",
  },
  {
    icon: Headset,
    title: "Relais humain",
    description:
      "Quand une question dépasse ses connaissances, l'assistant vous prévient pour que vous repreniez la main.",
  },
  {
    icon: ChartColumn,
    title: "Amélioration continue",
    description:
      "Les questions sans réponse remontent dans votre tableau de bord. Complétez-les en un clic.",
  },
]

const STEPS = [
  {
    title: "Importez",
    description:
      "Ajoutez vos catalogues, listes de prix et questions fréquentes.",
  },
  {
    title: "Personnalisez",
    description:
      "Choisissez le ton, la langue d'accueil et les couleurs de l'assistant.",
  },
  {
    title: "Publiez",
    description:
      "Activez-le sur votre site et votre page Facebook, puis suivez les résultats.",
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Accueil Mpanampy">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="#fonctionnalites"
              className={buttonVariants({
                variant: "ghost",
                className: "hidden sm:inline-flex",
              })}
            >
              Fonctionnalités
            </Link>
            <ThemeToggle />
            <Link
              href="/login"
              className={buttonVariants({ variant: "ghost" })}
            >
              Se connecter
            </Link>
            <Link href="/register" className={buttonVariants()}>
              Commencer
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[480px] max-w-4xl rounded-full bg-primary/10 blur-3xl"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-6">
              <p className="w-fit rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                Conçu pour les commerces de Madagascar
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Votre meilleur vendeur, disponible{" "}
                <span className="text-primary">jour et nuit</span>.
              </h1>
              <p className="max-w-xl text-lg text-pretty text-muted-foreground">
                Mpanampy répond à vos clients sur votre site et sur Messenger,
                en français, en malgache et en anglais, à partir de vos propres
                catalogues et FAQ.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className={buttonVariants({ size: "lg" })}
                >
                  Créer mon assistant
                  <ArrowRight data-icon="inline-end" />
                </Link>
                <Link
                  href="#fonctionnement"
                  className={buttonVariants({ size: "lg", variant: "outline" })}
                >
                  Comment ça marche
                </Link>
              </div>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section
          id="fonctionnalites"
          className="scroll-mt-16 border-t bg-muted/40"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight">
                Tout ce qu&apos;il faut pour vendre en ligne
              </h2>
              <p className="text-muted-foreground">
                Un assistant qui connaît vos produits aussi bien que vous, et
                qui ne laisse aucun message sans réponse.
              </p>
            </div>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <li key={title} className="rounded-xl border bg-card p-6">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-medium">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="fonctionnement" className="scroll-mt-16 border-t">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <h2 className="text-3xl font-semibold tracking-tight">
              Opérationnel en trois étapes
            </h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map(({ title, description }, index) => (
                <li key={title} className="space-y-3">
                  <span className="flex size-9 items-center justify-center rounded-full border font-mono text-sm text-primary">
                    {index + 1}
                  </span>
                  <h3 className="font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo className="text-foreground" />
          <p>© 2026 Mpanampy. Conçu à Madagascar.</p>
        </div>
      </footer>
    </div>
  )
}
