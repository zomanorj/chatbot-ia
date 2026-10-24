"use client"

import { Activity } from "lucide-react"
import { cn } from "cn"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useSystemStatus,
  type ComponentStatus,
} from "@/hooks/use-system-status"

const COMPONENTS = [
  { key: "api", label: "API" },
  { key: "database", label: "Base de données" },
  { key: "redis", label: "File de tâches (Redis)" },
] as const

function StatusLabel({ status }: { status?: ComponentStatus }) {
  const ok = status === "ok"
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm",
        ok ? "text-foreground" : "text-destructive",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          ok ? "bg-success" : "bg-destructive",
        )}
      />
      {ok ? "Opérationnel" : "Indisponible"}
    </span>
  )
}

export function SystemStatus() {
  const { data, isPending } = useSystemStatus()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          État du système
        </CardTitle>
        <CardDescription>Actualisé toutes les 30 secondes.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {COMPONENTS.map(({ key, label }) => (
            <li
              key={key}
              className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              {isPending ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                <StatusLabel
                  status={
                    data?.[key as keyof typeof data] as
                      ComponentStatus | undefined
                  }
                />
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
