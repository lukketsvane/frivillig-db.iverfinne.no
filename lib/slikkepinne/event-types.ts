// Types for Slikkepinne Events stored in Supabase

export type TimeSlot = "morning" | "afternoon" | "evening" | "flexible"

export interface SlikkepinneEvent {
  id: string
  title: string
  description: string | null
  time_slot: TimeSlot
  location: string
  duration: string
  event_date: string
  lat: number | null
  lng: number | null
  organization_id: string | null // Link to organization
  organization_name: string | null // Denormalized for quick display
  created_at: string
  updated_at: string | null
  status: "active" | "completed" | "cancelled"
  contact_info: string | null
}

export interface CreateEventInput {
  title: string
  description?: string
  time_slot: TimeSlot
  location: string
  duration: string
  event_date: string
  lat?: number
  lng?: number
  organization_id?: string
  organization_name?: string
  contact_info?: string
}

export interface EventWithOrganization extends SlikkepinneEvent {
  organization?: {
    id: string
    navn: string
    hjemmeside: string | null
    epost: string | null
    telefon: string | null
    aktivitet: string | null
  } | null
}

// Agent mode step types for progress tracking
export type AgentStep =
  | "idle"
  | "analyzing"
  | "extracting_interests"
  | "searching_organizations"
  | "matching"
  | "generating_recommendations"
  | "complete"
  | "error"

export interface AgentProgress {
  step: AgentStep
  message: string
  progress: number // 0-100
  details?: string
}

export const AGENT_STEP_INFO: Record<AgentStep, { label: string; progress: number }> = {
  idle: { label: "Klar til å starte", progress: 0 },
  analyzing: { label: "Analyserer inndata...", progress: 15 },
  extracting_interests: { label: "Finn interesser og ferdigheiter...", progress: 35 },
  searching_organizations: { label: "Søkjer i organisasjonar...", progress: 55 },
  matching: { label: "Finn dei beste tilpasningane...", progress: 75 },
  generating_recommendations: { label: "Lagar anbefalingar...", progress: 90 },
  complete: { label: "Ferdig!", progress: 100 },
  error: { label: "Noko gjekk gale", progress: 0 },
}

// Time slot display info
export const TIME_SLOT_INFO: Record<TimeSlot, { label: string; time: string; icon: string }> = {
  morning: { label: "Formiddag", time: "09:00–12:00", icon: "🌅" },
  afternoon: { label: "Ettermiddag", time: "12:00–17:00", icon: "☀️" },
  evening: { label: "Kveld", time: "17:00–20:00", icon: "🌆" },
  flexible: { label: "Fleksibel", time: "Varierer", icon: "🔄" },
}
