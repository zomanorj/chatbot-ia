import type { Metadata } from "next"

import { Overview } from "@/components/dashboard/overview"

export const metadata: Metadata = { title: "Vue d'ensemble" }

export default function DashboardPage() {
  return <Overview />
}
