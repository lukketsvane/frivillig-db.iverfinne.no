export interface Organization {
  id: string
  navn: string
  organisasjonsnummer: string
  organisasjonsform_beskrivelse: string | null
  forretningsadresse_poststed: string | null
  forretningsadresse_kommune: string | null
  fylke: string | null
  naeringskode1_beskrivelse: string | null
  registrert_i_frivillighetsregisteret: boolean | null
  hjemmeside: string | null
  epost: string | null
  telefon: string | null
  vedtektsfestet_formaal: string | null
  antall_ansatte: number | null
}
