import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Om tenesta - Frivillig-DB",
  description: "Lær om korleis Frivillig-DB fungerer og korleis me revolutionerer frivillighetsrekruttering",
}

export default function OmTenestaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
