import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Organisasjon | Frivilligorganisasjon-utforskar",
  description: "Informasjon om frivilligorganisasjon",
}

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
