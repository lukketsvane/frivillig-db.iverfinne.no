"use client"

import { useState, useEffect } from "react"
import { EventWizard } from "@/components/slikkepinne/event-wizard"
import { Shader, SolidColor, Pixelate, SineWave } from "shaders/react"

// Color palette for fading backgrounds
const COLOR_SCHEMES = [
  { bg: "#27085E", wave: "#EDF455" }, // Deep purple + lime
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
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  const currentScheme = COLOR_SCHEMES[colorIndex]

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Animated shader background with color transitions */}
      <div
        className={`fixed inset-0 -z-10 w-full h-full transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
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

      {/* Fixed header */}
      <header className="shrink-0 pt-safe px-4 pt-6 pb-4 text-center">
        <h1 className="text-2xl font-bold text-white italic tracking-tight">FRIVILLIG HJELP</h1>
        <p className="text-sm text-white/70 mt-1">Opprett ein aktivitet og finn frivillige</p>
      </header>

      {/* Content area - fills remaining space */}
      <div className="flex-1 min-h-0 px-4 pb-safe overflow-hidden">
        <EventWizard />
      </div>
    </main>
  )
}
