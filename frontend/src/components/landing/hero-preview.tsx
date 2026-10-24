import { FileText } from "lucide-react"

import { LogoMark } from "@/components/brand/logo"

export function HeroPreview() {
  return (
    <figure
      aria-label="Exemple de conversation entre un client et l'assistant"
      className="relative mx-auto w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl shadow-primary/5 sm:p-5"
    >
      <div className="flex items-center gap-2.5 border-b pb-3">
        <LogoMark className="size-8" />
        <div className="leading-tight">
          <p className="text-sm font-medium">Boutique Ravaka</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            Répond instantanément
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-4 text-sm">
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground">
          Salama! Mbola misy ve ilay akanjo mena, habe M?
        </p>
        <div className="max-w-[90%] space-y-2">
          <p className="w-fit rounded-2xl rounded-bl-md bg-muted px-3.5 py-2">
            Salama! Eny, mbola misy telo amin&apos;ny habe M. 45 000 Ar ny
            vidiny, ary azo aterina any Antananarivo rahampitso.
          </p>
          <p className="flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground">
            <FileText className="size-3.5" />
            Source : catalogue-octobre.pdf
          </p>
        </div>
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground">
          Tsara! 034 12 345 67 ny laharako.
        </p>
        <p className="flex w-fit items-center gap-1.5 rounded-full bg-highlight/20 px-2.5 py-1 text-xs font-medium text-highlight-foreground dark:text-highlight">
          Nouveau prospect enregistré
        </p>
      </div>

      <figcaption className="sr-only">
        Le client demande en malgache si une robe rouge taille M est disponible.
        L&apos;assistant répond avec le stock, le prix et la livraison, en
        citant le catalogue.
      </figcaption>
    </figure>
  )
}
