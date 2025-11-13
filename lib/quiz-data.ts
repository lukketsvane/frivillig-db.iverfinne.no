export type VolunteerType =
  | "Praktiker"
  | "Sosial Hjelper"
  | "Ekspert"
  | "Samfunnsbygger"
  | "Nettverker"
  | "Strategisk Bidragsyter"

export interface QuizOption {
  text: string
  scores: Partial<Record<VolunteerType, number>>
}

export interface QuizQuestion {
  id: number
  text: string
  options: QuizOption[]
}

export interface VolunteerTypeResult {
  title: string
  description: string
  recommended_areas: string[]
  icon: string
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: "Hva motiverer deg mest til å bidra frivillig?",
    options: [
      {
        text: "Å se konkrete resultater av min innsats og gjøre en forskjell.",
        scores: { Praktiker: 2, Samfunnsbygger: 1 },
      },
      {
        text: "Å møte nye mennesker og bygge nettverk.",
        scores: { Nettverker: 2, "Sosial Hjelper": 1 },
      },
      {
        text: "Å bruke mine faglige ferdigheter og kompetanse.",
        scores: { Ekspert: 2, Praktiker: 1 },
      },
      {
        text: "Å støtte en sak jeg brenner for, selv om jeg ikke er direkte involvert i den daglige driften.",
        scores: { "Strategisk Bidragsyter": 2, Samfunnsbygger: 1 },
      },
    ],
  },
  {
    id: 2,
    text: "Hvilken type oppgaver foretrekker du?",
    options: [
      {
        text: "Praktiske oppgaver som krever fysisk innsats eller håndverk.",
        scores: { Praktiker: 2, Samfunnsbygger: 1 },
      },
      {
        text: "Oppgaver som involverer direkte interaksjon med mennesker eller dyr.",
        scores: { "Sosial Hjelper": 2, Nettverker: 1 },
      },
      {
        text: "Administrative oppgaver, planlegging eller organisering.",
        scores: { "Strategisk Bidragsyter": 2, Ekspert: 1 },
      },
      {
        text: "Kreative oppgaver eller oppgaver som krever problemløsning.",
        scores: { Ekspert: 2, Nettverker: 1 },
      },
    ],
  },
  {
    id: 3,
    text: "Hvor mye tid er du villig til å investere i frivillig arbeid?",
    options: [
      {
        text: "Regelmessig, faste dager/timer hver uke/måned.",
        scores: { "Sosial Hjelper": 1, Praktiker: 1, Ekspert: 1 },
      },
      {
        text: "Prosjektbasert, når det er behov for spesifikk hjelp.",
        scores: { "Strategisk Bidragsyter": 2, Ekspert: 1 },
      },
      {
        text: "Av og til, sporadisk når jeg har tid og lyst.",
        scores: { Nettverker: 2 },
      },
      {
        text: "Lange perioder, for å fullføre et større mål.",
        scores: { Samfunnsbygger: 2, Praktiker: 1 },
      },
    ],
  },
  {
    id: 4,
    text: "Hvilket miljø trives du best i?",
    options: [
      {
        text: "Et teamorientert miljø hvor jeg kan samarbeide med andre.",
        scores: { Nettverker: 2, "Sosial Hjelper": 1 },
      },
      {
        text: "Et selvstendig miljø hvor jeg kan ta egne beslutninger.",
        scores: { Ekspert: 2, "Strategisk Bidragsyter": 1 },
      },
      {
        text: "Et miljø med direkte kontakt med de jeg hjelper.",
        scores: { "Sosial Hjelper": 2, Praktiker: 1 },
      },
      {
        text: "Et miljø hvor jeg kan bidra til langsiktig utvikling.",
        scores: { Samfunnsbygger: 2, "Strategisk Bidragsyter": 1 },
      },
    ],
  },
  {
    id: 5,
    text: "Hva håper du å få ut av ditt frivillige engasjement?",
    options: [
      {
        text: "En følelse av å bidra til noe meningsfylt.",
        scores: { Samfunnsbygger: 2, "Sosial Hjelper": 1 },
      },
      {
        text: "Muligheten til å lære nye ferdigheter eller videreutvikle eksisterende.",
        scores: { Ekspert: 2, Praktiker: 1 },
      },
      {
        text: "Å bygge nye vennskap og utvide mitt sosiale nettverk.",
        scores: { Nettverker: 2, "Sosial Hjelper": 1 },
      },
      {
        text: "Å påvirke samfunnet på et strukturelt nivå.",
        scores: { "Strategisk Bidragsyter": 2, Samfunnsbygger: 1 },
      },
    ],
  },
]

export const VOLUNTEER_TYPE_RESULTS: Record<VolunteerType, VolunteerTypeResult> = {
  Praktiker: {
    title: "Praktikeren",
    description:
      "Du trives med å se konkrete resultater av innsatsen din og foretrekker hands-on oppgaver. Du er ofte anlagt, tålmodig og ser verdien i langsiktig, praktisk arbeid. Du er en doer som får ting gjort!",
    recommended_areas: ["Miljø og naturvern", "Byutvikling og nærmiljø", "Humanitært arbeid", "Arrangement og eventer"],
    icon: "🔨",
  },
  "Sosial Hjelper": {
    title: "Den Sosiale Hjelperen",
    description:
      "Du drives av å hjelpe enkeltpersoner og grupper direkte. Du er empatisk, lyttende og trives i sosiale settinger hvor du kan yte støtte og omsorg. Mennesker trives i ditt selskap.",
    recommended_areas: ["Eldreomsorg", "Barne- og ungdomsarbeid", "Besøksvenn/mentor", "Integrering og mangfold"],
    icon: "🤝",
  },
  Ekspert: {
    title: "Eksperten",
    description:
      "Du liker å bruke din spesifikke kompetanse og dine faglige ferdigheter til å løse utfordringer. Du er analytisk, nøyaktig og verdsetter å bidra med din kunnskap for å forbedre prosesser eller resultater.",
    recommended_areas: [
      "Rådgivning og veiledning",
      "IT og teknologi",
      "Økonomi og administrasjon",
      "Markedsføring og kommunikasjon",
    ],
    icon: "🎓",
  },
  Samfunnsbygger: {
    title: "Samfunnsbyggeren",
    description:
      "Du brenner for å skape endring på et bredere samfunnsnivå. Du er visjonær, engasjert og ser verdien i langsiktig arbeid for å bygge et bedre lokalsamfunn eller en bedre verden. Du ønsker å være en del av noe større.",
    recommended_areas: [
      "Politisk arbeid og påvirkning",
      "Miljø- og klimasaker",
      "Likestilling og menneskerettigheter",
      "Kultur og idrettsutvikling",
    ],
    icon: "🌱",
  },
  Nettverker: {
    title: "Nettverkeren",
    description:
      "Du trives med å møte nye mennesker, bygge relasjoner og være en del av et sosialt miljø. Du er utadvendt, engasjerende og liker å organisere sosiale arrangementer. Du er limet som binder folk sammen.",
    recommended_areas: [
      "Arrangement og eventer",
      "Klubb- og foreningsarbeid",
      "Fadderordninger",
      "Lokalmiljøaktiviteter",
    ],
    icon: "🎉",
  },
  "Strategisk Bidragsyter": {
    title: "Strategisk Bidragsyter",
    description:
      "Du liker å tenke langsiktig og bidra med planlegging, strategi og organisering. Du er strukturert, løsningsorientert og trives med å se det store bildet. Du er en verdifull ressurs for enhver organisasjon.",
    recommended_areas: ["Styrearbeid", "Prosjektledelse", "Fungerende rådgiver", "Fundraising og økonomistyring"],
    icon: "📊",
  },
}

export function getSearchKeywordsForType(type: VolunteerType): string[] {
  const keywordMap: Record<VolunteerType, string[]> = {
    Praktiker: [
      "miljø",
      "naturvern",
      "byutvikling",
      "nærmiljø",
      "humanitært",
      "arrangement",
      "dugnad",
      "praktisk",
      "vedlikehold",
    ],
    "Sosial Hjelper": [
      "eldreomsorg",
      "barn",
      "ungdom",
      "besøksvenn",
      "mentor",
      "integrering",
      "omsorg",
      "sosial",
      "hjelp",
    ],
    Ekspert: [
      "rådgivning",
      "veiledning",
      "IT",
      "teknologi",
      "økonomi",
      "administrasjon",
      "markedsføring",
      "kommunikasjon",
      "kompetanse",
    ],
    Samfunnsbygger: [
      "politisk",
      "påvirkning",
      "miljø",
      "klima",
      "likestilling",
      "menneskerettigheter",
      "kultur",
      "idrett",
      "samfunn",
    ],
    Nettverker: ["arrangement", "event", "klubb", "forening", "fadder", "lokalmiljø", "sosial", "nettverk", "samling"],
    "Strategisk Bidragsyter": [
      "styre",
      "prosjektledelse",
      "rådgiver",
      "fundraising",
      "økonomi",
      "strategi",
      "planlegging",
      "organisering",
    ],
  }

  return keywordMap[type] || []
}
