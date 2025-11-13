export interface Organization {
  id: string
  navn: string
  aktivitet?: string
  vedtektsfestet_formaal?: string
  forretningsadresse_poststed?: string
  forretningsadresse_kommune?: string
  naeringskode1_beskrivelse?: string
  hjemmeside?: string
  epost?: string
  telefon?: string
  organisasjonsform_beskrivelse?: string
  registreringsdato_frivillighetsregisteret?: string
  stiftelsesdato?: string
  antall_ansatte?: string
}

export interface SearchFilters {
  kommune?: string
  aktivitet?: string
  searchQuery?: string
}
