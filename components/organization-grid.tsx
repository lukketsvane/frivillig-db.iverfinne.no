import { OrganizationCard } from "./organization-card"
import type { Organization } from "@/lib/types"

interface OrganizationGridProps {
  organizations: Organization[]
}

export function OrganizationGrid({ organizations }: OrganizationGridProps) {
  if (organizations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ingen organisasjonar funne</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {organizations.map((org) => (
        <OrganizationCard key={org.id} organization={org} />
      ))}
    </div>
  )
}
