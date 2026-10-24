import type { Metadata } from "next"
import { Suspense } from "react"

import { LoginForm } from "@/components/auth/login-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = { title: "Connexion" }

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Bon retour</CardTitle>
        <CardDescription>
          Connectez-vous pour gérer vos assistants.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
