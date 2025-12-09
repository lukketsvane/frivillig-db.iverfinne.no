"use client"

import { useState, useEffect } from "react"
import { EventWizard } from "@/components/slikkepinne/event-wizard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shader, SolidColor, Pixelate, SineWave } from "shaders/react"
import { ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"

// Color palette matching main page
const COLOR_SCHEMES = [
  { bg: "#27085E", wave: "#EDF455" }, // Deep purple + lime (main)
  { bg: "#0F172B", wave: "#48A0AD" }, // Navy + teal
  { bg: "#45275D", wave: "#1ABAA4" }, // Purple dark + mint
  { bg: "#2D2D2D", wave: "#9810FA" }, // Charcoal + bright purple
  { bg: "#020202", wave: "#FF6467" }, // Black + coral
]

export default function SlikkepinnePage() {
  const [colorIndex, setColorIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setColorIndex((prev) => (prev + 1) % COLOR_SCHEMES.length)
        setIsTransitioning(false)
      }, 500)
    }, 10000) // Slower transition for less distraction

    return () => clearInterval(interval)
  }, [])

  const currentScheme = COLOR_SCHEMES[colorIndex]

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-3 gap-3">
      {/* Animated shader background with color transitions - same as main page */}
      <div
        className={`fixed inset-0 -z-10 w-full h-full transition-opacity duration-500 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
      >
        <Shader className="w-full h-full">
          <SolidColor color={currentScheme.bg} maskType="alpha" />
          <Pixelate scale={15} maskType="alpha" opacity={0.84}>
            <SineWave
              color={currentScheme.wave}
              amplitude={0.87}
              frequency={10.8}
              speed={-0.5}
              angle={6}
              position={{ x: 0.5, y: 0.5 }}
              thickness={0.22}
              softness={0.44}
              maskType="alpha"
            />
          </Pixelate>
        </Shader>
      </div>

      {/* Card container - matching main page style */}
      <Card className="w-full max-w-md h-[600px] max-h-[85vh] flex flex-col shadow-lg overflow-hidden">
        {/* Header - matching main page */}
        <div className="border-b px-4 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-9 w-9 -ml-2">
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                slikkepinne
              </h1>
              <p className="text-xs text-muted-foreground">Opprett aktivitet for frivillige</p>
            </div>
          </div>
        </div>

        {/* Content - wizard fills remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <EventWizard />
        </div>

        {/* Footer - matching main page */}
        <div className="border-t px-4 py-3 shrink-0">
          <div className="flex gap-3 justify-center">
            <Link href="/" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              frivillig-db
            </Link>
            <Link
              href="/om-tenesta"
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              om tenesta
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
