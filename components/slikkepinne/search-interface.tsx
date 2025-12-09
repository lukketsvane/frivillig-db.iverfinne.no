"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import type { Organization } from "@/lib/slikkepinne/types"
import Link from "next/link"

const fetcher = async () => {
  const supabase = createClient()
  const { data } = await supabase.from("organizations_with_fylke").select("*").limit(500).order("navn")
  return data || []
}

export function SearchInterface() {
  const { data: orgs = [], isLoading } = useSWR<Organization[]>("slikkepinne-orgs", fetcher)
  const [search, setSearch] = useState("")
  const [fylke, setFylke] = useState("all")

  const filtered = useMemo(() => {
    let result = orgs
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (o) =>
          o.navn?.toLowerCase().includes(q) ||
          o.vedtektsfestet_formaal?.toLowerCase().includes(q) ||
          o.forretningsadresse_poststed?.toLowerCase().includes(q),
      )
    }
    if (fylke !== "all") {
      result = result.filter((o) => o.fylke === fylke)
    }
    return result
  }, [orgs, search, fylke])

  const fylker = useMemo(() => Array.from(new Set(orgs.map((o) => o.fylke).filter(Boolean))).sort() as string[], [orgs])

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-black text-white">
      <div className="flex-none p-2 space-y-2 border-b border-white/10">
        <input
          placeholder="søk"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full text-xs bg-black text-white border border-white/20 placeholder:text-white/40 px-3 rounded-md focus:outline-none focus:border-white/40"
        />
        <select 
          value={fylke} 
          onChange={(e) => setFylke(e.target.value)}
          className="h-8 w-full text-xs bg-black text-white border border-white/20 px-3 rounded-md focus:outline-none focus:border-white/40"
        >
          <option value="all">alle</option>
          {fylker.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div className="p-3 text-xs text-white/40 font-mono">laster...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center space-y-2">
            <div className="text-xs text-white/40 font-mono">ingen resultater</div>
            <button
              onClick={() => {
                setSearch("")
                setFylke("all")
              }}
              className="text-[10px] text-white/60 underline underline-offset-2 hover:text-white transition-colors"
            >
              nullstill søket
            </button>
          </div>
        ) : (
          <>
            <div className="px-3 py-2 text-[10px] text-white/40 font-mono border-b border-white/10">
              {filtered.length} {filtered.length === 1 ? "organisasjon" : "organisasjoner"}
            </div>
            <div className="grid grid-cols-1 gap-px p-px bg-white/10">
              {filtered.map((org) => (
                <Link
                  key={org.id}
                  href={`/slikkepinne/org/${org.id}`}
                  className="p-3 bg-black hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <div className="text-xs font-medium text-white truncate">{org.navn}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {org.fylke && <div className="text-[10px] text-white/40">{org.fylke}</div>}
                    {org.forretningsadresse_poststed && org.forretningsadresse_poststed !== org.fylke && (
                      <>
                        <div className="text-[10px] text-white/20">•</div>
                        <div className="text-[10px] text-white/40">{org.forretningsadresse_poststed}</div>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
