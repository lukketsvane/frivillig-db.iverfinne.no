import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import type { Organization } from "@/lib/slikkepinne/types"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = await createClient()
    const { data: org, error } = await supabase
      .from("organizations_with_fylke")
      .select("navn, vedtektsfestet_formaal, fylke")
      .eq("id", id)
      .single()

    if (error || !org) {
      return { title: "Organisasjon ikkje funnen" }
    }

    return {
      title: `${org.navn} - slikkepinne`,
      description: org.vedtektsfestet_formaal || `${org.navn} i ${org.fylke || "Norge"}`,
      openGraph: {
        title: org.navn,
        description: org.vedtektsfestet_formaal || `${org.navn} i ${org.fylke || "Norge"}`,
        type: "website",
      },
    }
  } catch {
    return { title: "Organisasjon ikkje funnen" }
  }
}

export default async function OrgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()

  const { data: org, error } = await supabase.from("organizations_with_fylke").select("*").eq("id", id).single() as { data: Organization | null, error: unknown }

  if (error || !org) {
    notFound()
  }

  return (
    <div className="h-[100dvh] w-full bg-black text-white overflow-y-auto">
      <div className="p-4 pb-safe">
        <Link
          href="/slikkepinne"
          className="inline-flex items-center gap-1.5 text-xs text-white/60 mb-6 hover:text-white active:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>tilbake</span>
        </Link>

        <div className="space-y-6 max-w-2xl pb-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-lg font-bold text-white leading-tight">{org.navn}</h1>
          <div className="flex flex-wrap gap-2 text-xs">
            {org.fylke && (
              <span className="px-2 py-1 bg-white/10 text-white/80 rounded-md border border-white/10">
                {org.fylke}
              </span>
            )}
            {org.forretningsadresse_poststed && org.forretningsadresse_poststed !== org.fylke && (
              <span className="px-2 py-1 bg-white/10 text-white/80 rounded-md border border-white/10">
                {org.forretningsadresse_poststed}
              </span>
            )}
            {org.registrert_i_frivillighetsregisteret && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-md border border-green-500/30 text-[10px]">
                Frivillighetsregisteret
              </span>
            )}
          </div>
        </div>

        {/* Purpose/Goal */}
        {org.vedtektsfestet_formaal && (
          <div className="space-y-2 p-4 bg-white/5 rounded-lg border border-white/10">
            <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Formål</h2>
            <p className="text-sm text-white/90 leading-relaxed">{org.vedtektsfestet_formaal}</p>
          </div>
        )}

        {/* Activity Description */}
        {org.aktivitet && (
          <div className="space-y-2 p-4 bg-white/5 rounded-lg border border-white/10">
            <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Aktivitet</h2>
            <p className="text-sm text-white/90 leading-relaxed">{org.aktivitet}</p>
          </div>
        )}

        {/* Contact Information */}
        {(org.hjemmeside || org.epost || org.telefon || org.mobiltelefon) && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Kontakt</h2>
            <div className="space-y-2">
              {org.hjemmeside && (
                <a
                  href={org.hjemmeside.startsWith("http") ? org.hjemmeside : `https://${org.hjemmeside}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 text-xs text-white hover:bg-white/10 active:bg-white/10 transition-colors break-all"
                >
                  <span className="text-white/60">🌐</span>
                  <span>{org.hjemmeside}</span>
                </a>
              )}
              {org.epost && (
                <a
                  href={`mailto:${org.epost}`}
                  className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 text-xs text-white hover:bg-white/10 active:bg-white/10 transition-colors"
                >
                  <span className="text-white/60">✉️</span>
                  <span>{org.epost}</span>
                </a>
              )}
              {org.telefon && (
                <a
                  href={`tel:${org.telefon}`}
                  className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 text-xs text-white hover:bg-white/10 active:bg-white/10 transition-colors"
                >
                  <span className="text-white/60">📞</span>
                  <span>{org.telefon}</span>
                </a>
              )}
              {org.mobiltelefon && (
                <a
                  href={`tel:${org.mobiltelefon}`}
                  className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 text-xs text-white hover:bg-white/10 active:bg-white/10 transition-colors"
                >
                  <span className="text-white/60">📱</span>
                  <span>{org.mobiltelefon}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Addresses */}
        {(org.forretningsadresse_adresse || org.postadresse_adresse) && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Adresser</h2>
            <div className="grid grid-cols-1 gap-3">
              {org.forretningsadresse_adresse && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Forretningsadresse</div>
                  <div className="text-xs text-white/80 space-y-1">
                    {Array.isArray(org.forretningsadresse_adresse) && org.forretningsadresse_adresse.map((line: string, idx: number) => (
                      <div key={idx}>{line}</div>
                    ))}
                    {org.forretningsadresse_postnummer && org.forretningsadresse_poststed && (
                      <div>{org.forretningsadresse_postnummer} {org.forretningsadresse_poststed}</div>
                    )}
                    {org.forretningsadresse_kommune && (
                      <div className="text-[10px] text-white/40 mt-1">{org.forretningsadresse_kommune}</div>
                    )}
                  </div>
                </div>
              )}
              {org.postadresse_adresse && org.postadresse_adresse !== org.forretningsadresse_adresse && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Postadresse</div>
                  <div className="text-xs text-white/80 space-y-1">
                    {Array.isArray(org.postadresse_adresse) && org.postadresse_adresse.map((line: string, idx: number) => (
                      <div key={idx}>{line}</div>
                    ))}
                    {org.postadresse_postnummer && org.postadresse_poststed && (
                      <div>{org.postadresse_postnummer} {org.postadresse_poststed}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Organization Details */}
        {(org.organisasjonsform_beskrivelse || org.organisasjonsnummer || org.antall_ansatte !== null || org.naeringskode1_beskrivelse) && (
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Organisasjonsinfo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {org.organisasjonsform_beskrivelse && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Type</div>
                  <div className="text-xs text-white/80">{org.organisasjonsform_beskrivelse}</div>
                </div>
              )}
              {org.organisasjonsnummer && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Org.nummer</div>
                  <div className="text-xs text-white/80 font-mono">{org.organisasjonsnummer}</div>
                </div>
              )}
              {org.antall_ansatte !== null && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Ansatte</div>
                  <div className="text-xs text-white/80">{org.antall_ansatte}</div>
                </div>
              )}
              {org.naeringskode1_beskrivelse && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Næring</div>
                  <div className="text-xs text-white/80">{org.naeringskode1_beskrivelse}</div>
                </div>
              )}
              {org.stiftelsesdato && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Stiftelsesdato</div>
                  <div className="text-xs text-white/80">{new Date(org.stiftelsesdato).toLocaleDateString('nb-NO')}</div>
                </div>
              )}
              {org.registreringsdato_frivillighetsregisteret && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Reg. i frivillighetsreg.</div>
                  <div className="text-xs text-white/80">{new Date(org.registreringsdato_frivillighetsregisteret).toLocaleDateString('nb-NO')}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Registration Status */}
        {(org.registrert_i_mvaregisteret || org.registrert_i_foretaksregisteret || org.registrert_i_stiftelsesregisteret) && (
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Registreringer</h2>
            <div className="flex flex-wrap gap-2">
              {org.registrert_i_mvaregisteret && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30 text-[10px]">
                  MVA-registeret
                </span>
              )}
              {org.registrert_i_foretaksregisteret && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30 text-[10px]">
                  Foretaksregisteret
                </span>
              )}
              {org.registrert_i_stiftelsesregisteret && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30 text-[10px]">
                  Stiftelsesregisteret
                </span>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
