"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, MapPin, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { OrganizationGrid } from "@/components/organization-grid"
import type { OrganizationCardData } from "@/lib/organization-search"

interface SearchResult {
  organizations: Array<{
    id: string
    navn: string
    aktivitet?: string
    vedtektsfestet_formaal?: string
    forretningsadresse_poststed?: string
    forretningsadresse_kommune?: string
    hjemmeside?: string
    telefon?: string
    epost?: string
  }>
  total: number
}

export function EnhancedSearch() {
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const queryInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut to focus search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        queryInputRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const performSearch = useCallback(async (searchQuery: string, searchLocation: string) => {
    // Don't search if both fields are empty
    if (!searchQuery.trim() && !searchLocation.trim()) {
      setResults(null)
      setShowResults(false)
      return
    }

    setIsLoading(true)
    setShowResults(true)

    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.append("q", searchQuery.trim())
      if (searchLocation.trim()) params.append("location", searchLocation.trim())
      params.append("limit", "50")

      const response = await fetch(`/api/organizations?${params.toString()}`)
      const data = await response.json()

      setResults(data)
    } catch (error) {
      console.error("Search error:", error)
      setResults({ organizations: [], total: 0 })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search effect
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query, location)
    }, 300) // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, location, performSearch])

  const clearSearch = () => {
    setQuery("")
    setLocation("")
    setResults(null)
    setShowResults(false)
  }

  const hasActiveSearch = query.trim() || location.trim()

  return (
    <div className="space-y-6">
      {/* Search inputs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Query input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={queryInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søk etter organisasjon, aktivitet eller formål..."
                className="pl-10 pr-20"
              />
              {!query && (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-block px-2 py-0.5 text-xs bg-muted rounded border border-input text-muted-foreground pointer-events-none">
                  ⌘K
                </kbd>
              )}
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Location input */}
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Stad eller kommune..."
                className="pl-10 pr-10"
              />
              {location && (
                <button
                  onClick={() => setLocation("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Clear button */}
            {hasActiveSearch && (
              <button
                onClick={clearSearch}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-md hover:bg-accent transition-colors"
              >
                Nullstill
              </button>
            )}
          </div>

          {/* Search status */}
          {hasActiveSearch && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Søker...</span>
                </>
              ) : results ? (
                <span>
                  Fann <strong className="text-foreground">{results.total}</strong> organisasjonar
                </span>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {showResults && (
        <>
          {isLoading && !results ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : results && results.organizations.length > 0 ? (
            <OrganizationGrid
              organizations={results.organizations.map((org) => ({
                id: org.id,
                navn: org.navn,
                aktivitet: org.aktivitet,
                formaal: org.vedtektsfestet_formaal,
                poststed: org.forretningsadresse_poststed,
                kommune: org.forretningsadresse_kommune,
                hjemmeside: org.hjemmeside,
                telefon: org.telefon,
                epost: org.epost,
              }))}
            />
          ) : results ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="space-y-3">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
                  <div>
                    <p className="text-foreground font-medium">Fann ingen organisasjonar</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Prøv å endre søket ditt eller bruk færre filter
                    </p>
                  </div>
                  <button
                    onClick={clearSearch}
                    className="mt-4 px-4 py-2 text-sm border border-input rounded-md hover:bg-accent transition-colors"
                  >
                    Nullstill søk
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {/* Initial state - popular categories or suggestions */}
      {!hasActiveSearch && !showResults && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-3">
              <Search className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
              <div>
                <h3 className="font-semibold text-foreground">Søk i 70 000+ frivilligorganisasjonar</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Skriv inn eit søkeord eller stad for å komme i gang
                </p>
              </div>

              {/* Popular search suggestions */}
              <div className="pt-4">
                <p className="text-xs text-muted-foreground mb-2">Populære søk:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Idrettslag", "Friluftsliv", "Kultur", "Helse", "Barn og ungdom", "Dyrevelferd"].map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded-full transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
