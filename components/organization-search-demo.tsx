"use client"

// Component: OrganizationSearchDemo
// Demonstrates the searchOrganizations custom tool integration
// Shows how to use the useOrganizationSearch hook with Claude Sonnet 4.5

import { useState } from "react"
import { useOrganizationSearch } from "@/lib/hooks/useOrganizationSearch"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function OrganizationSearchDemo() {
  const { results, meta, loading, error, search } = useOrganizationSearch()
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")

  const handleSearch = async () => {
    await search({
      query: query || undefined,
      location: location || undefined,
      limit: 20,
      include_contact: true,
      include_detailed: false,
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Søk i frivillige organisasjoner</h2>

        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Søk etter organisasjon, aktivitet eller formål..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>

          <div className="w-64">
            <Input
              type="text"
              placeholder="Stad (Oslo, Bergen...)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>

          <Button onClick={handleSearch} disabled={loading}>
            {loading ? "Søker..." : "Søk"}
          </Button>
        </div>

        {meta && (
          <div className="text-sm text-muted-foreground">
            Fant {meta.total} organisasjoner ({meta.query_time_ms}ms)
            {meta.has_more && ` - viser ${meta.returned} av ${meta.total}`}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg">
          Feil: {error.message}
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((org) => (
            <Card key={org.id} className="p-4 hover:shadow-lg transition-shadow">
              <h3 className="font-semibold text-lg mb-2">{org.navn}</h3>

              {org.aktivitet && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                  {org.aktivitet}
                </p>
              )}

              <div className="space-y-1 text-sm">
                {org.forretningsadresse_poststed && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📍</span>
                    <span>
                      {org.forretningsadresse_poststed}
                      {org.fylke && ` (${org.fylke})`}
                    </span>
                  </div>
                )}

                {org.hjemmeside && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">🌐</span>
                    <a
                      href={org.hjemmeside}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate"
                    >
                      {org.hjemmeside}
                    </a>
                  </div>
                )}

                {org.epost && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📧</span>
                    <a href={`mailto:${org.epost}`} className="text-blue-600 hover:underline truncate">
                      {org.epost}
                    </a>
                  </div>
                )}

                {org.telefon && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📞</span>
                    <a href={`tel:${org.telefon}`} className="text-blue-600 hover:underline">
                      {org.telefon}
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <a
                  href={`/organisasjon/${org.slug || org.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Les meir →
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && results.length === 0 && meta && (
        <div className="text-center py-12 text-muted-foreground">
          Ingen organisasjoner funnet. Prøv eit anna søk.
        </div>
      )}
    </div>
  )
}
