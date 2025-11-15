"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { interpretTagsErikson } from "@/lib/erikson-theory"

const STEP_TITLES = ["Personleg informasjon", "Interesser og ferdigheiter", "Tilgjenge og preferansar"]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  // Step 1: Personal information
  const [displayName, setDisplayName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [location, setLocation] = useState("")
  const [biography, setBiography] = useState("")

  // Step 2: Interests and skills
  const [newTag, setNewTag] = useState("")
  const [interestTags, setInterestTags] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState("")
  const [skills, setSkills] = useState<string[]>([])

  // Step 3: Availability and preferences
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [hoursPerWeek, setHoursPerWeek] = useState("")
  const [startDate, setStartDate] = useState("")
  const [emailDigest, setEmailDigest] = useState(true)
  const [profileVisibility, setProfileVisibility] = useState("public")

  const DAYS = ["Måndag", "Tysdag", "Onsdag", "Torsdag", "Fredag", "Laurdag", "Sundag"]

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      // Load existing profile if any
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileData) {
        setDisplayName(profileData.display_name || "")
        setBirthDate(profileData.birth_date || "")
        setLocation(profileData.location || "")
        setBiography(profileData.biography || "")
        setInterestTags(profileData.interest_tags || [])
        setSkills(profileData.skills || [])
        
        if (profileData.availability) {
          setSelectedDays(profileData.availability.days || [])
          setHoursPerWeek(String(profileData.availability.hours_per_week || ""))
          setStartDate(profileData.availability.start_date || "")
        }
        
        if (profileData.notification_preferences) {
          setEmailDigest(profileData.notification_preferences.email_digest ?? true)
        }
        
        setProfileVisibility(profileData.profile_visibility || "public")
      }
    }

    loadUser()
  }, [router, supabase])

  const handleAddTag = () => {
    if (newTag.trim() && !interestTags.includes(newTag.trim())) {
      setInterestTags([...interestTags, newTag.trim()])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setInterestTags(interestTags.filter((t) => t !== tag))
  }

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill))
  }

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSubmit = async () => {
    if (!user) return

    setIsLoading(true)

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: displayName,
          birth_date: birthDate || null,
          location: location,
          biography: biography,
          interest_tags: interestTags,
          skills: skills,
          availability: {
            days: selectedDays,
            hours_per_week: hoursPerWeek ? parseInt(hoursPerWeek, 10) : 0,
            start_date: startDate || null,
          },
          notification_preferences: {
            email_digest: emailDigest,
            new_matches: true,
            bookmark_updates: true,
          },
          profile_visibility: profileVisibility,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("[v0] Error saving profile:", error)
      alert("Kunne ikkje lagre profilen. Prøv igjen.")
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    if (step < 3) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  if (!user) {
    return <div className="flex min-h-svh items-center justify-center">Lastar...</div>
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-rose-50 to-teal-50 dark:from-zinc-900 dark:to-zinc-800">
      <div className="w-full max-w-2xl">
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-2 w-12 rounded-full ${
                      s === step ? "bg-foreground" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">Steg {step} av 3</span>
            </div>
            <CardTitle className="text-3xl font-bold">{STEP_TITLES[step - 1]}</CardTitle>
            <CardDescription>Fullfør profilen din for beste resultat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Fullt namn *</Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ditt fulle namn"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="birthDate">Fødselsdato</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Vi bruker alderen din for å foreslå relevante organisasjonar
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location">Stad</Label>
                  <Input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Oslo, Bergen, Trondheim..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="biography">Om deg</Label>
                  <Textarea
                    id="biography"
                    value={biography}
                    onChange={(e) => setBiography(e.target.value)}
                    placeholder="Fortel litt om deg sjølv, din erfaring og kva du er lidenskapleg om..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="interests">Interesser</Label>
                  <div className="flex gap-2">
                    <Input
                      id="interests"
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                      placeholder="Natur, kultur, helse..."
                    />
                    <Button type="button" onClick={handleAddTag} variant="secondary">
                      Legg til
                    </Button>
                  </div>
                  {interestTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {interestTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 px-3 py-1">
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="ml-1">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="skills">Ferdigheiter og kompetanse</Label>
                  <div className="flex gap-2">
                    <Input
                      id="skills"
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                      placeholder="Leiing, undervisning, økonomi..."
                    />
                    <Button type="button" onClick={handleAddSkill} variant="secondary">
                      Legg til
                    </Button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="gap-1 px-3 py-1">
                          {skill}
                          <button onClick={() => handleRemoveSkill(skill)} className="ml-1">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Basert på interessene og ferdigheitene dine vil vi foreslå organisasjonar som passar
                    deg best
                  </p>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="grid gap-2">
                  <Label>Tilgjengeleg dagar</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day) => (
                      <Button
                        key={day}
                        type="button"
                        variant={selectedDays.includes(day) ? "default" : "outline"}
                        onClick={() => toggleDay(day)}
                        className="flex-1 min-w-[100px]"
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="hoursPerWeek">Timar per veke</Label>
                  <Input
                    id="hoursPerWeek"
                    type="number"
                    min="0"
                    max="168"
                    value={hoursPerWeek}
                    onChange={(e) => setHoursPerWeek(e.target.value)}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">Kor mange timar kan du bidra per veke?</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="startDate">Startdato</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Når kan du starte?</p>
                </div>

                <div className="space-y-3 pt-2">
                  <Label>Preferansar</Label>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">E-post varsling</p>
                      <p className="text-sm text-muted-foreground">Motta vekentleg oppsummering</p>
                    </div>
                    <Button
                      type="button"
                      variant={emailDigest ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEmailDigest(!emailDigest)}
                    >
                      {emailDigest ? "På" : "Av"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Profilsynlegheit</p>
                      <p className="text-sm text-muted-foreground">Kven kan sjå profilen din</p>
                    </div>
                    <Button
                      type="button"
                      variant={profileVisibility === "public" ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setProfileVisibility(profileVisibility === "public" ? "private" : "public")
                      }
                    >
                      {profileVisibility === "public" ? "Offentleg" : "Privat"}
                    </Button>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Tilbake
                </Button>
              )}
              {step < 3 ? (
                <Button type="button" onClick={nextStep} className="flex-1">
                  Neste
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={isLoading} className="flex-1">
                  {isLoading ? "Lagrar..." : "Fullfør"}
                </Button>
              )}
            </div>

            {step === 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/")}
                className="w-full"
              >
                Hopp over
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
