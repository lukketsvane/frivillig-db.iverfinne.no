import { NextResponse } from "next/server"
import { getOrganizationById } from "@/lib/organization-search"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const organization = await getOrganizationById(id)

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    return NextResponse.json(organization)
  } catch (error) {
    console.error("[v0] Error fetching organization:", error)
    return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 })
  }
}
