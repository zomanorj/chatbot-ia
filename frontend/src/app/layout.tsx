import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { Providers } from "@/components/providers"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
})
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Mpanampy — Assistant IA pour les commerces",
    template: "%s · Mpanampy",
  },
  description:
    "Un assistant IA qui répond à vos clients sur votre site et sur Messenger, en français, en malgache et en anglais, à partir de vos propres documents.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
