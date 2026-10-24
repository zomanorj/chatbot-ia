import type { Metadata } from "next"

import { RegisterForm } from "@/components/auth/register-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = { title: "Créer un compte" }

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Créer votre compte</CardTitle>
        <CardDescription>
          Votre premier assistant est prêt en quelques minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  )
}
