#!/usr/bin/env tsx
/**
 * Søk etter designrelaterte frivilligorganisasjonar i Oslo
 * Bruker JSON-databasen direkte utan API-kall
 */

import { readFile } from "fs/promises"
import { join } from "path"

interface Organization {
  id?: string
  organisasjonsnummer: string
  navn: string
  aktivitet?: string
  vedtektsfestet_formaal?: string
  forretningsadresse_poststed?: string
  forretningsadresse_kommune?: string
  forretningsadresse_adresse?: string | string[]
  forretningsadresse_postnummer?: string
  naeringskode1_beskrivelse?: string
  naeringskode1_kode?: string
  hjemmeside?: string
  epost?: string
  telefon?: string
  mobiltelefon?: string
  stiftelsesdato?: string
  registrert_i_frivillighetsregisteret?: boolean
  [key: string]: any
}

// Nøkkelord for design og kreative felt
const DESIGN_KEYWORDS = [
  'design', 'form', 'formgiving', 'industridesign', 'produktdesign',
  'grafisk', 'visuell', 'illustrasjon', 'foto', 'typografi',
  'arkitektur', 'interiør', 'møbel', 'spatial', 'scenografi',
  'kunst', 'kreativ', 'kunstnar', 'galleri', 'utstilling',
  'digital', 'interaksjon', 'ux', 'interface', 'media',
  'keramikk', 'tekstil', 'tre', 'metall', 'handverk', 'making',
  'kultur', 'kreativitet', 'workshop', 'maker', 'studio'
]

async function loadAllOrganizations(): Promise<Organization[]> {
  const organizations: Organization[] = []
  const fileCount = 9

  for (let i = 1; i <= fileCount; i++) {
    try {
      const filePath = join(process.cwd(), "public", "db", `organizations_part_${i}.json`)
      const content = await readFile(filePath, "utf-8")
      const data = JSON.parse(content)
      const orgs = Array.isArray(data) ? data : data.organizations || []
      organizations.push(...orgs)
    } catch (error) {
      console.error(`Kunne ikkje laste fil ${i}:`, error)
    }
  }

  return organizations
}

function calculateRelevanceScore(org: Organization): number {
  let score = 0

  const navn = (org.navn || '').toLowerCase()
  const aktivitet = (org.aktivitet || '').toLowerCase()
  const formaal = (org.vedtektsfestet_formaal || '').toLowerCase()
  const naering = (org.naeringskode1_beskrivelse || '').toLowerCase()

  // Høg score for direkte match i namn
  for (const keyword of DESIGN_KEYWORDS) {
    if (navn.includes(keyword)) {
      score += 10
      if (keyword === 'design') score += 5 // Ekstra for "design"
    }
    if (aktivitet.includes(keyword)) {
      score += 5
    }
    if (formaal.includes(keyword)) {
      score += 3
    }
    if (naering.includes(keyword)) {
      score += 2
    }
  }

  // Bonus for kultursektoren (90.*, 94.*)
  const kode = String(org.naeringskode1_kode || '')
  if (kode.startsWith('90.') || kode.startsWith('94.')) {
    score += 3
  }

  return score
}

function formatAddress(adr: string | string[] | undefined): string {
  if (!adr) return ''
  if (Array.isArray(adr)) {
    return adr.join(', ')
  }
  if (typeof adr === 'string') {
    try {
      const parsed = JSON.parse(adr)
      if (Array.isArray(parsed)) {
        return parsed.join(', ')
      }
    } catch {
      return adr
    }
  }
  return String(adr)
}

function formatOrganization(org: Organization, index: number): string {
  const lines: string[] = []

  lines.push(`\n${'='.repeat(75)}`)
  lines.push(`\n${index}. ${org.navn}`)
  lines.push(`   Org.nr: ${org.organisasjonsnummer}`)

  if (org.forretningsadresse_adresse) {
    const adr = formatAddress(org.forretningsadresse_adresse)
    const postnr = org.forretningsadresse_postnummer || ''
    const poststed = org.forretningsadresse_poststed || ''
    if (adr || postnr || poststed) {
      lines.push(`   📍 ${adr}${adr ? ', ' : ''}${postnr} ${poststed}`)
    }
  }

  if (org.aktivitet) {
    const akt = org.aktivitet.length > 300
      ? org.aktivitet.substring(0, 297) + '...'
      : org.aktivitet
    lines.push(`\n   💡 Aktivitet:`)
    lines.push(`   ${akt}`)
  }

  if (org.vedtektsfestet_formaal && org.vedtektsfestet_formaal !== org.aktivitet) {
    const formaal = org.vedtektsfestet_formaal.length > 200
      ? org.vedtektsfestet_formaal.substring(0, 197) + '...'
      : org.vedtektsfestet_formaal
    lines.push(`\n   🎯 Formål:`)
    lines.push(`   ${formaal}`)
  }

  if (org.naeringskode1_beskrivelse) {
    lines.push(`\n   🏢 ${org.naeringskode1_beskrivelse}`)
  }

  const kontakt: string[] = []
  if (org.hjemmeside) kontakt.push(`🌐 ${org.hjemmeside}`)
  if (org.epost) kontakt.push(`📧 ${org.epost}`)
  if (org.telefon) kontakt.push(`📞 ${org.telefon}`)
  if (org.mobiltelefon && org.mobiltelefon !== org.telefon) {
    kontakt.push(`📱 ${org.mobiltelefon}`)
  }

  if (kontakt.length > 0) {
    lines.push(`\n   ${kontakt.join(' | ')}`)
  }

  if (org.stiftelsesdato) {
    const aar = org.stiftelsesdato.substring(0, 4)
    lines.push(`   📅 Stifta ${aar}`)
  }

  return lines.join('\n')
}

async function main() {
  console.log('🎨 FRIVILLIGORGANISASJONAR I OSLO FOR DESIGNARAR PÅ 28\n')
  console.log('Lastar organisasjonsdatabase...\n')

  const allOrgs = await loadAllOrganizations()
  console.log(`✓ Lasta ${allOrgs.length.toLocaleString()} organisasjonar\n`)

  // Filtrer for Oslo og frivilligregisteret
  const osloOrgs = allOrgs.filter(org => {
    if (!org.registrert_i_frivillighetsregisteret) return false

    const kommune = (org.forretningsadresse_kommune || '').toUpperCase()
    const poststed = (org.forretningsadresse_poststed || '').toUpperCase()

    return kommune === 'OSLO' || poststed === 'OSLO'
  })

  console.log(`✓ Fann ${osloOrgs.length} frivilligorganisasjonar i Oslo`)
  console.log('Søkjer etter design-relaterte organisasjonar...\n')

  // Skår og sorter
  const scoredOrgs = osloOrgs
    .map(org => ({
      org,
      score: calculateRelevanceScore(org)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  console.log(`✓ Fann ${scoredOrgs.length} designrelaterte organisasjonar\n`)

  // Vis topp 5
  console.log('━'.repeat(75))
  console.log('TOPP 5 MEST RELEVANTE ORGANISASJONAR')
  console.log('━'.repeat(75))

  scoredOrgs.slice(0, 5).forEach(({ org, score }, i) => {
    console.log(formatOrganization(org, i + 1))
    console.log(`   ⭐ Relevans: ${score} poeng\n`)
  })

  // Vis statistikk
  console.log('\n' + '━'.repeat(75))
  console.log('ANALYSE')
  console.log('━'.repeat(75))

  // Sektorfordeling
  const sectors = new Map<string, number>()
  scoredOrgs.slice(0, 20).forEach(({ org }) => {
    const sektor = org.naeringskode1_beskrivelse || 'Ukjend'
    sectors.set(sektor, (sectors.get(sektor) || 0) + 1)
  })

  console.log('\n📊 Sektorfordeling (topp 20):')
  Array.from(sectors.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([sektor, antal]) => {
      console.log(`   • ${sektor}: ${antal}`)
    })

  // Nøkkelordanalyse
  const keywordCounts = new Map<string, number>()
  scoredOrgs.slice(0, 20).forEach(({ org }) => {
    const text = `${org.navn} ${org.aktivitet} ${org.vedtektsfestet_formaal}`.toLowerCase()
    DESIGN_KEYWORDS.forEach(kw => {
      if (text.includes(kw)) {
        keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1)
      }
    })
  })

  console.log('\n🔍 Mest brukte nøkkelord (topp 20):')
  Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([kw, antal]) => {
      console.log(`   • "${kw}": ${antal}`)
    })

  console.log('\n' + '━'.repeat(75))
  console.log('\n💡 KONKLUSJON:\n')
  console.log('Oslo har eit rikt kulturliv med mange kreative organisasjonar, men få')
  console.log('som eksplisitt kategoriserer seg som "designorganisasjonar". Dei mest')
  console.log('relevante organisasjonane finst i krysningspunkta mellom kunst, kultur,')
  console.log('handverk og visuelle uttrykk. For ein designer på 28 vil laterale')
  console.log('tilnærmingar – å søkje i kultursektoren, utstillings- og galleriverksemd,')
  console.log('og materialpraksis – truleg gi meir interessante resultat enn å søkje')
  console.log('direkte etter "design".\n')
}

main().catch(console.error)
