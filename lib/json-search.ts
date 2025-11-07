import { readFile } from "fs/promises"
import { join } from "path"

export interface Organization {
  id: string
  organisasjonsnummer: string
  navn: string
  aktivitet?: string
  vedtektsfestet_formaal?: string
  forretningsadresse_poststed?: string
  forretningsadresse_kommune?: string
  forretningsadresse_fylke?: string
  forretningsadresse_postnummer?: string
  [key: string]: any
}

let cachedOrganizations: Organization[] | null = null

/**
 * Lastar alle organisasjonar frå JSON-filene (9 filer)
 * Cachear resultatet i minnet for raskare tilgang
 * Prøver først lokale filer, så GitHub raw URLs som fallback
 */
export async function loadAllOrganizations(): Promise<Organization[]> {
  if (cachedOrganizations) {
    return cachedOrganizations
  }

  const organizations: Organization[] = []
  const fileCount = 9

  for (let i = 1; i <= fileCount; i++) {
    try {
      // Prøv å laste frå lokal fil først
      const filePath = join(process.cwd(), "public", "db", `organizations_part_${i}.json`)
      const content = await readFile(filePath, "utf-8")
      const data = JSON.parse(content)

      // Data kan vere ein array eller eit objekt med array
      const orgs = Array.isArray(data) ? data : data.organizations || []
      organizations.push(...orgs)

      console.log(`[JSON Search] Loaded ${orgs.length} organizations from local part ${i}`)
    } catch (localError) {
      // Om lokal fil feilar, prøv å laste frå GitHub
      try {
        const githubUrl = `https://raw.githubusercontent.com/lukketsvane/frivillig-db.iverfinne.no/refs/heads/main/public/db/organizations_part_${i}.json`
        console.log(`[JSON Search] Local file failed, trying GitHub: ${githubUrl}`)

        const response = await fetch(githubUrl)
        if (!response.ok) {
          throw new Error(`GitHub fetch failed: ${response.status}`)
        }

        const data = await response.json()
        const orgs = Array.isArray(data) ? data : data.organizations || []
        organizations.push(...orgs)

        console.log(`[JSON Search] Loaded ${orgs.length} organizations from GitHub part ${i}`)
      } catch (githubError) {
        console.error(`[JSON Search] Failed to load organizations_part_${i}.json from both local and GitHub:`, githubError)
      }
    }
  }

  console.log(`[JSON Search] Total organizations loaded: ${organizations.length}`)
  cachedOrganizations = organizations
  return organizations
}

/**
 * Søk i organisasjonar med tekst-matching
 */
export async function searchOrganizationsJSON(options: {
  query: string
  location?: string
  limit?: number
  userPostnummer?: string
  userKommune?: string
  userFylke?: string
}): Promise<Organization[]> {
  const { query, location, limit = 5, userPostnummer, userKommune, userFylke } = options

  const allOrgs = await loadAllOrganizations()

  const queryLower = query.toLowerCase()
  const locationLower = location?.toLowerCase()

  // Skår kvar organisasjon basert på relevans
  const scoredOrgs = allOrgs
    .filter((org) => {
      // Filtrer bort organisasjonar utan organisasjonsnummer (me treng det for URL!)
      if (!org.organisasjonsnummer) return false
      return true
    })
    .map((org) => {
      let score = 0

      // Søk i namn (høgast vekt)
      if (org.navn?.toLowerCase().includes(queryLower)) {
        score += 100
      }

      // Søk i aktivitet
      if (org.aktivitet?.toLowerCase().includes(queryLower)) {
        score += 50
      }

      // Søk i formål
      if (org.vedtektsfestet_formaal?.toLowerCase().includes(queryLower)) {
        score += 30
      }

      // Lokasjonsmatch
      if (locationLower) {
        if (org.forretningsadresse_poststed?.toLowerCase().includes(locationLower)) {
          score += 40
        }
        if (org.forretningsadresse_kommune?.toLowerCase().includes(locationLower)) {
          score += 35
        }
        if (org.forretningsadresse_fylke?.toLowerCase().includes(locationLower)) {
          score += 25
        }
      }

      // Geografisk nærheit (bonus om brukar har oppgjeve lokasjon)
      if (userFylke && org.forretningsadresse_fylke === userFylke) {
        score += 20
      }
      if (userKommune && org.forretningsadresse_kommune === userKommune) {
        score += 30
      }
      if (userPostnummer && org.forretningsadresse_postnummer === userPostnummer) {
        score += 40
      }

      return { org, score }
    })
    .filter(({ score }) => score > 0) // Berre organisasjonar med match
    .sort((a, b) => b.score - a.score) // Sorter etter skår (høgast først)
    .slice(0, limit)
    .map(({ org }) => org)

  console.log(`[JSON Search] Query: "${query}", Found: ${scoredOrgs.length} results`)

  return scoredOrgs
}

/**
 * Finn ein spesifikk organisasjon basert på organisasjonsnummer
 */
export async function findOrganizationByOrgnr(orgnr: string): Promise<Organization | null> {
  const allOrgs = await loadAllOrganizations()
  return allOrgs.find((org) => org.organisasjonsnummer === orgnr) || null
}

/**
 * Nullstill cache (bruk dette om JSON-filene blir oppdatert)
 */
export function clearOrganizationsCache() {
  cachedOrganizations = null
}
