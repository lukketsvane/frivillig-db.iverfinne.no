"use client"

import type React from "react"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { useState } from "react"

interface SearchFiltersProps {
  kommuner: string[]
}

export function SearchFilters({ kommuner }: SearchFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (searchQuery) {
      params.set("search", searchQuery)
    } else {
      params.delete("search")
    }
    params.delete("page")
    router.push(`/utforsk?${params.toString()}`)
  }

  const handleKommuneChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set("kommune", value)
    } else {
      params.delete("kommune")
    }
    params.delete("page")
    router.push(`/utforsk?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearchQuery("")
    router.push("/utforsk")
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <form onSubmit={handleSearch} className="flex-1 flex gap-2">
        <Input
          type="text"
          placeholder="Søk etter organisasjonar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      <Select value={searchParams.get("kommune") || "all"} onValueChange={handleKommuneChange}>
        <SelectTrigger className="w-full md:w-[200px]">
          <SelectValue placeholder="Vel kommune" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle kommunar</SelectItem>
          {kommuner.map((kommune) => (
            <SelectItem key={kommune} value={kommune}>
              {kommune}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(searchParams.get("search") || searchParams.get("kommune")) && (
        <Button variant="outline" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Nullstill
        </Button>
      )}
    </div>
  )
}
