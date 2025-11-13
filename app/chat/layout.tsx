import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Chat - Frivillige Organisasjoner",
  description: "Chat med AI om frivillige organisasjoner i Norge",
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
