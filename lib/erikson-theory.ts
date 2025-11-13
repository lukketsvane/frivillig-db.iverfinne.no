// Erik Erikson's 8 psychosocial development stages
// Used to subtly guide volunteer recommendations based on life phase

export interface EriksonStage {
  stage: number
  name: string
  ageRange: string
  crisis: string
  needsKeywords: string[]
  organizationTypes: string[]
}

export const eriksonStages: EriksonStage[] = [
  {
    stage: 1,
    name: "Trust vs. Mistrust",
    ageRange: "0-1.5 år",
    crisis: "Tillit og tryggheit",
    needsKeywords: ["foreldre", "småbarn", "sped", "amming", "familie"],
    organizationTypes: ["Familie", "Foreldre", "Småbarn"],
  },
  {
    stage: 2,
    name: "Autonomy vs. Shame",
    ageRange: "1.5-3 år",
    crisis: "Autonomi og sjølvstende",
    needsKeywords: ["småbarn", "lek", "motorikk", "utforsking"],
    organizationTypes: ["Barnehage", "Lek", "Motorikk"],
  },
  {
    stage: 3,
    name: "Initiative vs. Guilt",
    ageRange: "3-6 år",
    crisis: "Initiativ og kreativitet",
    needsKeywords: ["førskulebarn", "kreativitet", "lek", "fantasi"],
    organizationTypes: ["Barnehage", "Kultur", "Kreativitet", "Idrett"],
  },
  {
    stage: 4,
    name: "Industry vs. Inferiority",
    ageRange: "6-12 år",
    crisis: "Dugleik og kompetanse",
    needsKeywords: ["skuleborn", "læring", "idrett", "hobby", "kompetanse"],
    organizationTypes: ["Idrett", "Kultur", "Musikk", "Speiding", "Natur"],
  },
  {
    stage: 5,
    name: "Identity vs. Role Confusion",
    ageRange: "12-18 år",
    crisis: "Identitet og rolle",
    needsKeywords: ["ungdom", "identitet", "fellesskap", "kultur", "musikk"],
    organizationTypes: ["Ungdom", "Kultur", "Idrett", "Politikk", "Miljø"],
  },
  {
    stage: 6,
    name: "Intimacy vs. Isolation",
    ageRange: "18-40 år",
    crisis: "Intimitet og relasjonar",
    needsKeywords: ["unge vaksne", "sosial", "nettverk", "frivillig", "engasjement"],
    organizationTypes: ["Sosial", "Kultur", "Miljø", "Humanitær", "Idrett"],
  },
  {
    stage: 7,
    name: "Generativity vs. Stagnation",
    ageRange: "40-65 år",
    crisis: "Generativitet og å gje tilbake",
    needsKeywords: ["vaksne", "mentorar", "mentor", "leiing", "bidra", "erfaring"],
    organizationTypes: ["Mentorar", "Humanitær", "Sosial", "Miljø", "Kultur"],
  },
  {
    stage: 8,
    name: "Integrity vs. Despair",
    ageRange: "65+ år",
    crisis: "Integritet og livsoversikt",
    needsKeywords: ["pensjonist", "senior", "eldre", "sosial", "erfaring", "visdom"],
    organizationTypes: ["Senior", "Sosial", "Kultur", "Helse", "Mentorar"],
  },
]

export function identifyLifeStage(userMessage: string): EriksonStage | null {
  const lowerMessage = userMessage.toLowerCase()

  // Check for explicit age mentions
  const ageMatch = lowerMessage.match(/(\d+)\s*år/)
  if (ageMatch) {
    const age = Number.parseInt(ageMatch[1])

    for (const stage of eriksonStages) {
      const [min, max] = stage.ageRange.split("-").map((s) => {
        const num = Number.parseInt(s.replace(/[^\d]/g, ""))
        return isNaN(num) ? 999 : num
      })

      if (age >= min && (max === 999 || age <= max)) {
        return stage
      }
    }
  }

  // Check for keyword matches
  for (const stage of eriksonStages) {
    for (const keyword of stage.needsKeywords) {
      if (lowerMessage.includes(keyword)) {
        return stage
      }
    }
  }

  return null
}

export function generateStageGuidance(stage: EriksonStage): string {
  const guidance: Record<number, string> = {
    1: "For familiar med dei yngste, søkjer eg etter organisasjonar som støttar foreldre og gir trygg tilknyting.",
    2: "For born i denne alderen søkjer eg etter aktivitetar som fremjar sjølvstende og utforsking.",
    3: "For førskulebarn søkjer eg etter aktivitetar som stimulerer kreativitet og initiativ.",
    4: "For skuleborn søkjer eg etter aktivitetar som byggjer kompetanse og dugleik.",
    5: "For ungdom søkjer eg etter fellesskap som støttar identitetsutvikling og roller.",
    6: "For unge vaksne søkjer eg etter organisasjonar som fremjar sosiale relasjonar og engasjement.",
    7: "For vaksne søkjer eg etter moglegheiter til å bidra, mentor og gje tilbake til samfunnet.",
    8: "For seniorar søkjer eg etter aktivitetar som gir meining, sosial kontakt og moglegheit til å dele erfaring.",
  }

  return guidance[stage.stage] || ""
}
