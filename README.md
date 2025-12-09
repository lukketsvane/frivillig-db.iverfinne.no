# Frivillig-DB

En plattform for å knytte frivillige til lokale organisasjoner og opprette forespørsler om frivillig hjelp.

## Oversikt

Frivillig-DB er en webapplikasjon som gjør det enkelt å:
- Finne frivillige organisasjoner basert på interesser og lokasjon
- Opprette forespørsler om frivillig hjelp via "Slikkepinne"-funksjonen
- Bruke AI for personaliserte anbefalinger
- Ta en quiz for å finne passende frivilligmuligheter

## Om Tenesta

Plattformen har en unik tilnærming til frivillighetsrekruttering:

1. **QR-kode på slikkepinnen** - En QR-kode på Vinmonopolets "Kjærlighet på pinne" leder direkte til frivillig.iverfinne.no, der kven som helst kan opprette ei forespørsel om frivillig hjelp.

2. **Rask prosess** - Prosessen tek under eitt minutt: Skriv kva du treng hjelp til → vel stad, tid og dato → få ein delbar QR-kode og lenke.

3. **Piggy-backing-mekanismen** - Me rir på eksisterande infrastruktur (Vinmonopolet sine 350 butikkar) for å nå folk i kvardagen – ikkje gjennom kampanjar, men gjennom tilfeldig oppdaging.

4. **Kreativ deltakelse** - Unge vaksne (18-30) kan bruke plattforma som eit kreativt verktøy – opprette annonsar for frivilligsentralen, formulere engasjerande tekstar, og slik bidra med kompetansen sin utan å forplikte seg til langsiktig frivillighet.

5. **Relasjonell formulering** - Eksempelet "Bli med å lage pannekaker med bestemor" viser korleis konkret, relasjonell formulering appellerer til 50-65-åringar – ikkje abstrakt "bli frivillig", men dette mennesket treng deg.

6. **Delbar QR-kode** - QR-koden som vert generert kan printast, delast på sosiale medium, eller hengast opp lokalt – kvar førespursel blir sin eigen mini-kampanje.

7. **Lokal forankring** - Oppsal Frivilligsentral og Bydel Østensjø står som avsendarar – dette gir legitimitet og lokal forankring utan at sentralen treng administrere kvar enkelt annonse.

8. **Invertert rekruttering** - Plattforma inverterer rekrutteringslogikken: I staden for at sentralen leitar etter frivillige, kjem behovet til den frivillige gjennom ein konkret, stadlokalisert førespursel.

9. **Datainnsamling** - Koplinga til visleg.no som overordna plattform gjer det mogleg å aggregere data på tvers av sentralar – kva type førespurnader konverterer, kor lang tid tek det, kva formuleringar fungerer.

10. **Distribuert infrastruktur** - Sluttresultatet: Ein distribuert rekrutteringsinfrastruktur der unge skapar innhald, eksisterande nettverk (Vinmonopolet, bibliotek, butikkar) distribuerer, og 50-65-åringar oppdagar moglegheiter der dei allereie er.

## Kom i gang

### Forutsetninger

- Node.js 18+ og pnpm
- Supabase-konto
- OpenAI API-nøkkel (for AI-funksjoner)

### Installasjon

```bash
# Installer avhengigheter
pnpm install

# Opprett .env.local fil med nødvendige miljøvariabler
cp .env.example .env.local
```

### Miljøvariabler

Opprett en `.env.local` fil med følgende variabler:

| Variabel | Beskrivelse |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Påkrevd.** URL til ditt Supabase-prosjekt |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Påkrevd.** Anonym nøkkel fra Supabase |
| `OPENAI_API_KEY` | **Påkrevd.** API-nøkkel for OpenAI (brukes til AI-chat) |

### Kjøre lokalt

```bash
# Utviklingsmodus
pnpm dev

# Bygg for produksjon
pnpm build

# Start produksjonsserver
pnpm start
```

Applikasjonen vil være tilgjengelig på [http://localhost:3000](http://localhost:3000).

## Funksjoner

### Hovedfunksjoner

- **AI-drevet matchmaking** - Bruk AI til å finne organisasjoner basert på profil og preferanser
- **Slikkepinne** - Opprett og del forespørsler om frivillig hjelp via QR-koder
- **Quiz** - Ta en quiz for å finne passende frivilligmuligheter
- **Utforsk** - Bla gjennom alle tilgjengelige organisasjoner
- **Brukerautentisering** - Logg inn med e-post/passord eller Google OAuth
- **Profil** - Administrer din profil, favoritter og bokmerker

### Supabase-integrasjon

Prosjektet bruker Supabase for:
- Brukerautentisering (e-post/passord og OAuth)
- Database for organisasjoner, forespørsler og brukerdata
- Sanntidssync av favoritter og bokmerker

## Teknologi

- **Next.js 15** - React-rammeverk med App Router
- **TypeScript** - Typesikkerhet
- **Supabase** - Backend og autentisering
- **Tailwind CSS** - Styling
- **Radix UI** - UI-komponenter
- **OpenAI** - AI-funksjoner
- **Vercel** - Hosting og deployment

## Prosjektstruktur

```
/app                 # Next.js App Router sider
  /api              # API-ruter
  /login            # Innloggingsside
  /signup           # Registreringsside
  /profile          # Brukerprofilside
  /slikkepinne      # Forespørselsside
  /utforsk          # Organisasjonsoversikt
  /quiz             # Quiz-side
/components         # React-komponenter
/lib                # Hjelpefunksjoner og utils
  /supabase         # Supabase-konfigurasjoner
/public             # Statiske filer
```

## Bidra

Bidrag er velkomne! Vennligst opprett en issue eller pull request for forslag og forbedringer.

## Lisens

Dette prosjektet er utviklet for Oppsal Frivilligsentral og Bydel Østensjø.