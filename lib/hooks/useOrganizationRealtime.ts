// React Hook: useOrganizationRealtime
// Purpose: Subscribe to real-time organization updates via Supabase Realtime
// Usage: const { organization, loading, error } = useOrganizationRealtime(orgId)

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface Organization {
  id: string
  organisasjonsnummer: string
  navn: string
  organisasjonsform_beskrivelse: string
  naeringskode1_beskrivelse: string
  naeringskode2_beskrivelse?: string
  naeringskode3_beskrivelse?: string
  aktivitet: string
  vedtektsfestet_formaal: string
  forretningsadresse_poststed: string
  forretningsadresse_kommune: string
  forretningsadresse_adresse: string
  forretningsadresse_postnummer: string
  postadresse_poststed: string
  postadresse_postnummer: string
  postadresse_adresse: string
  hjemmeside: string
  epost: string
  telefon: string
  mobiltelefon?: string
  antall_ansatte?: number
  stiftelsesdato?: string
  registreringsdato_frivillighetsregisteret?: string
  fylke?: string
}

interface RealtimePayload {
  event: "organization_created" | "organization_updated" | "organization_deleted"
  table: string
  schema: string
  old?: Partial<Organization>
  new?: Partial<Organization>
  timestamp: string
}

interface UseOrganizationRealtimeReturn {
  organization: Organization | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useOrganizationRealtime(organizationId: string): UseOrganizationRealtimeReturn {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  const supabase = createClient()

  // Fetch initial state
  const fetchOrganization = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("organizations")
        .select(
          `
          id,
          organisasjonsnummer,
          navn,
          organisasjonsform_beskrivelse,
          naeringskode1_beskrivelse,
          naeringskode2_beskrivelse,
          naeringskode3_beskrivelse,
          aktivitet,
          vedtektsfestet_formaal,
          forretningsadresse_poststed,
          forretningsadresse_kommune,
          forretningsadresse_adresse,
          forretningsadresse_postnummer,
          postadresse_poststed,
          postadresse_postnummer,
          postadresse_adresse,
          hjemmeside,
          epost,
          telefon,
          mobiltelefon,
          antall_ansatte,
          stiftelsesdato,
          registreringsdato_frivillighetsregisteret
        `
        )
        .eq("id", organizationId)
        .single()

      if (fetchError) throw fetchError

      setOrganization(data as Organization)
    } catch (err) {
      console.error("[useOrganizationRealtime] Fetch error:", err)
      setError(err instanceof Error ? err : new Error("Failed to fetch organization"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchOrganization()

    // Set up Realtime subscription
    const setupRealtime = async () => {
      try {
        // Check if user is authenticated
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          console.warn("[useOrganizationRealtime] No active session, Realtime may not work for private channels")
        }

        // Create private channel for this organization
        const channelName = `organization:${organizationId}`
        const realtimeChannel = supabase.channel(channelName, {
          config: {
            private: true, // Requires authentication and RLS policies
          },
        })

        // Subscribe to organization_created events
        realtimeChannel.on("broadcast", { event: "organization_created" }, (payload) => {
          console.log("[useOrganizationRealtime] Organization created:", payload)
          const data = payload.payload as RealtimePayload

          if (data.new && data.new.id === organizationId) {
            setOrganization((prev) => (data.new ? { ...prev, ...data.new } as Organization : prev))
          }
        })

        // Subscribe to organization_updated events
        realtimeChannel.on("broadcast", { event: "organization_updated" }, (payload) => {
          console.log("[useOrganizationRealtime] Organization updated:", payload)
          const data = payload.payload as RealtimePayload

          if (data.new && data.new.id === organizationId) {
            setOrganization((prev) => {
              if (!prev) return null

              // Merge updates (apply diff using old/new)
              return {
                ...prev,
                ...data.new,
              } as Organization
            })
          }
        })

        // Subscribe to organization_deleted events
        realtimeChannel.on("broadcast", { event: "organization_deleted" }, (payload) => {
          console.log("[useOrganizationRealtime] Organization deleted:", payload)
          const data = payload.payload as RealtimePayload

          if (data.old && data.old.id === organizationId) {
            setOrganization(null)
            setError(new Error("Organization has been deleted"))
          }
        })

        // Subscribe to channel
        realtimeChannel.subscribe((status) => {
          console.log(`[useOrganizationRealtime] Channel ${channelName} status:`, status)

          if (status === "SUBSCRIBED") {
            console.log(`[useOrganizationRealtime] Successfully subscribed to ${channelName}`)
          } else if (status === "CHANNEL_ERROR") {
            console.error(`[useOrganizationRealtime] Channel error for ${channelName}`)
            setError(new Error("Failed to subscribe to real-time updates"))
          }
        })

        setChannel(realtimeChannel)
      } catch (err) {
        console.error("[useOrganizationRealtime] Realtime setup error:", err)
        setError(err instanceof Error ? err : new Error("Failed to set up real-time subscription"))
      }
    }

    setupRealtime()

    // Cleanup on unmount
    return () => {
      if (channel) {
        console.log("[useOrganizationRealtime] Unsubscribing from channel")
        supabase.removeChannel(channel)
      }
    }
  }, [organizationId])

  return {
    organization,
    loading,
    error,
    refetch: fetchOrganization,
  }
}
