"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { describeError } from "@/lib/errors"

import { useAuth } from "./auth-provider"
import { FormError } from "./form-error"
import { FormField } from "./form-field"

export function RegisterForm() {
  const { register } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    try {
      await register({
        full_name: String(form.get("full_name")),
        organization_name: String(form.get("organization_name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
      })
      router.replace("/dashboard/bots/new")
    } catch (err) {
      setError(describeError(err))
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <FormField
        id="full_name"
        label="Votre nom"
        autoComplete="name"
        required
        maxLength={120}
        autoFocus
      />
      <FormField
        id="organization_name"
        label="Nom de votre commerce"
        autoComplete="organization"
        placeholder="Boutique Ravaka"
        required
        maxLength={120}
      />
      <FormField
        id="email"
        label="Adresse e-mail"
        type="email"
        autoComplete="email"
        required
      />
      <FormField
        id="password"
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        hint="8 caractères minimum."
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Création du compte…" : "Créer mon compte"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  )
}
