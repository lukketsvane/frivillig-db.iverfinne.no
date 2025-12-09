import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { CreateEventInput, SlikkepinneEvent } from "@/lib/slikkepinne/event-types"

// GET - List events
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const organizationId = searchParams.get("organization_id")
    const status = searchParams.get("status") || "active"
    const limit = parseInt(searchParams.get("limit") || "50")

    let query = supabase
      .from("slikkepinne_events")
      .select("*")
      .eq("status", status)
      .order("event_date", { ascending: true })
      .limit(limit)

    if (organizationId) {
      query = query.eq("organization_id", organizationId)
    }

    const { data: events, error } = await query

    if (error) {
      console.error("Error fetching events:", error)
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
    }

    return NextResponse.json({ events })
  } catch (error) {
    console.error("Events GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a new event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: CreateEventInput = await request.json()

    // Validate required fields
    if (!body.title || !body.time_slot || !body.location || !body.event_date) {
      return NextResponse.json(
        { error: "Missing required fields: title, time_slot, location, event_date" },
        { status: 400 }
      )
    }

    // Generate a short ID for easy sharing
    const shortId = crypto.randomUUID().substring(0, 8)

    const eventData = {
      id: shortId,
      title: body.title,
      description: body.description || null,
      time_slot: body.time_slot,
      location: body.location,
      duration: body.duration || "1 time",
      event_date: body.event_date,
      lat: body.lat || null,
      lng: body.lng || null,
      organization_id: body.organization_id || null,
      organization_name: body.organization_name || null,
      contact_info: body.contact_info || null,
      status: "active" as const,
      created_at: new Date().toISOString(),
    }

    const { data: event, error } = await supabase
      .from("slikkepinne_events")
      .insert(eventData)
      .select()
      .single()

    if (error) {
      console.error("Error creating event:", error)
      // If table doesn't exist, return a helpful message
      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error: "Events table not found. Please run the migration.",
            fallback: true,
            event: eventData
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
    }

    return NextResponse.json({ event, success: true })
  } catch (error) {
    console.error("Events POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Update event status
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 })
    }

    const validStatuses = ["active", "completed", "cancelled"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const { data: event, error } = await supabase
      .from("slikkepinne_events")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating event:", error)
      return NextResponse.json({ error: "Failed to update event" }, { status: 500 })
    }

    return NextResponse.json({ event, success: true })
  } catch (error) {
    console.error("Events PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
