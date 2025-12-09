export interface Organization {
  id: string
  navn: string
  organisasjonsnummer: string | null
  organisasjonsform_beskrivelse: string | null
  forretningsadresse_poststed: string | null
  forretningsadresse_postnummer: string | null
  forretningsadresse_kommune: string | null
  forretningsadresse_adresse: string[] | null
  postadresse_adresse: string[] | null
  postadresse_postnummer: string | null
  postadresse_poststed: string | null
  fylke: string | null
  naeringskode1_beskrivelse: string | null
  registrert_i_frivillighetsregisteret: boolean | null
  hjemmeside: string | null
  epost: string | null
  telefon: string | null
  mobiltelefon: string | null
  vedtektsfestet_formaal: string | null
  aktivitet: string | null
  antall_ansatte: number | null
  stiftelsesdato: string | null
  registreringsdato_frivillighetsregisteret: string | null
  registrert_i_mvaregisteret: boolean | null
  registrert_i_foretaksregisteret: boolean | null
  registrert_i_stiftelsesregisteret: boolean | null
}
