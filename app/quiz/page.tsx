"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { QUIZ_QUESTIONS, VOLUNTEER_TYPE_RESULTS, type VolunteerType } from "@/lib/quiz-data"

export default function QuizPage() {
  const [stage, setStage] = useState<"intro" | "question" | "result">("intro")
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [scores, setScores] = useState<Record<VolunteerType, number>>({
    Praktiker: 0,
    "Sosial Hjelper": 0,
    Ekspert: 0,
    Samfunnsbygger: 0,
    Nettverker: 0,
    "Strategisk Bidragsyter": 0,
  })
  const [result, setResult] = useState<VolunteerType | null>(null)

  const handleStart = () => {
    setStage("question")
  }

  const handleAnswer = (optionIndex: number) => {
    const question = QUIZ_QUESTIONS[currentQuestion]
    const option = question.options[optionIndex]

    // Update scores
    const newScores = { ...scores }
    Object.entries(option.scores).forEach(([type, points]) => {
      newScores[type as VolunteerType] += points
    })
    setScores(newScores)

    // Move to next question or show result
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Calculate result
      const maxScore = Math.max(...Object.values(newScores))
      const topType = Object.entries(newScores).find(([_, score]) => score === maxScore)?.[0] as VolunteerType
      setResult(topType)
      setStage("result")
    }
  }

  const progress = ((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 gap-3 bg-background">
      <Card className="w-full max-w-2xl min-h-[600px] flex flex-col shadow-lg">
        <div className="border-b px-6 py-4 flex items-center gap-4 shrink-0">
          <Button variant="ghost" size="icon" asChild className="active:scale-95">
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Tilbake til quiz</span>
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">Tilbake til quiz</h1>
        </div>

        <div className="flex-1 p-6 flex flex-col">
          {stage === "intro" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
              <h2 className="text-4xl font-bold">Finn din frivilligtype!</h2>
              <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                Er du usikker på hvilken type frivillig du er, eller hva som passer best for deg? Ta denne quizen for å
                finne din ideelle frivilligtype og oppdag spennende muligheter!
              </p>
              <Button onClick={handleStart} size="lg" className="mt-4 min-h-[44px] text-lg active:scale-95">
                Start quizen!
              </Button>
            </div>
          )}

          {stage === "question" && (
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Spørsmål {currentQuestion + 1} av {QUIZ_QUESTIONS.length}
                </p>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-2xl font-semibold mb-6 leading-relaxed">{QUIZ_QUESTIONS[currentQuestion].text}</h3>

                <div className="space-y-3">
                  {QUIZ_QUESTIONS[currentQuestion].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      className="w-full text-left p-4 min-h-[44px] border-2 border-border hover:border-foreground/40 hover:bg-muted/50 active:scale-95 transition-all leading-relaxed"
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stage === "result" && result && (
            <div className="flex-1 flex flex-col items-center justify-between py-8">
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-lg">
                <h2 className="text-3xl font-bold leading-tight">
                  Din frivilligtype ir:
                  <br />
                  {VOLUNTEER_TYPE_RESULTS[result].title}!
                </h2>

                <div className="text-6xl my-4">{VOLUNTEER_TYPE_RESULTS[result].icon}</div>

                <p className="text-base text-muted-foreground leading-relaxed">
                  {VOLUNTEER_TYPE_RESULTS[result].description}
                </p>

                <div className="w-full mt-4">
                  <h3 className="text-lg font-semibold mb-3 text-left">Anbefalte områder:</h3>
                  <div className="space-y-2">
                    {VOLUNTEER_TYPE_RESULTS[result].recommended_areas.map((area, index) => (
                      <div key={index} className="p-3 border border-border text-left min-h-[44px] flex items-center">
                        {area}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button asChild size="lg" className="w-full mt-6 min-h-[44px] text-lg active:scale-95">
                <Link href="/utforsk">Utforsk organisasjons</Link>
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
