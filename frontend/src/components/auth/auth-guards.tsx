"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { LogoMark } from "@/components/brand/logo"

import { useAuth } from "./auth-provider"

function FullScreenLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center" role="status">
      <LogoMark className="size-10 animate-pulse" />
      <span className="sr-only">Chargement</span>
    </div>
  )
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      // Read at redirect time instead of usePathname, so the shell stays prerenderable.
      const next = window.location.pathname + window.location.search
      router.replace(
        next === "/dashboard"
          ? "/login"
          : `/login?next=${encodeURIComponent(next)}`,
      )
    }
  }, [status, router])

  return status === "authenticated" ? children : <FullScreenLoader />
}

/**
 * Sends visitors who arrive already signed in to the dashboard. Sign-ins that happen
 * on the page are left alone: the form decides where to go next.
 */
export function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode
}) {
  const { status } = useAuth()
  const router = useRouter()
  const [arrivedSignedIn, setArrivedSignedIn] = useState<boolean | null>(null)

  if (arrivedSignedIn === null && status !== "loading") {
    setArrivedSignedIn(status === "authenticated")
  }

  useEffect(() => {
    if (arrivedSignedIn) router.replace("/dashboard")
  }, [arrivedSignedIn, router])

  return arrivedSignedIn === false ? children : <FullScreenLoader />
}
