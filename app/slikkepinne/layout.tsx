import type React from "react"
import type { Metadata } from "next"
import { Chatbot } from "@/components/slikkepinne/chatbot"
import { SWRProvider } from "@/components/slikkepinne/swr-provider"
import "./slikkepinne.css"

export const metadata: Metadata = {
  title: "slikkepinne - frivillig søk",
  description: "finn organisasjonar",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "slikkepinne",
  },
}

export default function SlikkepinneLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="font-mono antialiased slikkepinne-container">
      <SWRProvider>
        {children}
        <Chatbot />
      </SWRProvider>
    </div>
  )
}
