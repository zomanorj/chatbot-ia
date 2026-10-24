"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { describeError } from "@/lib/errors"

import { useAuth } from "./auth-provider"
import { FormError } from "./form-error"
import { FormField } from "./form-field"

function safeNext(value: string | null): string {
  // Only same-site paths, to prevent open redirects.
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard"
}

export function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    try {
      await login(String(form.get("email")), String(form.get("password")))
      router.replace(safeNext(searchParams.get("next")))
    } catch (err) {
      setError(describeError(err))
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <FormField
        id="email"
        label="Adresse e-mail"
        type="email"
        autoComplete="email"
        required
        autoFocus
      />
      <FormField
        id="password"
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        required
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </form>
  )
}
