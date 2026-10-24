"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/components/auth/auth-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function UserMenu() {
  const { me, logout } = useAuth()
  const router = useRouter()
  if (!me) return null
  const organization = me.organizations[0]

  async function signOut() {
    await logout()
    router.replace("/login")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {initials(me.user.full_name)}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-medium">
            {me.user.full_name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {organization?.name}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
            {me.user.email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
