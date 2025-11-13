import { NextResponse } from "next/server"
import { searchOrganizations } from "@/lib/organization-search"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get("location") || undefined
    const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!) : 20

    const organizations = await searchOrganizations({
      location,
      limit,
    })

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error("[v0] Error in organizations API:", error)
    return NextResponse.json({ error: "Failed to fetch organizations", organizations: [] }, { status: 500 })
  }
}
