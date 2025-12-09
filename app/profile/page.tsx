"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, User, Mail, Loader2, LogOut, Star, Bookmark, MessageSquare } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Shader, SolidColor, Pixelate, SineWave } from "shaders/react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [fullName, setFullName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [stats, setStats] = useState({
    favorites: 0,
    bookmarks: 0,
    chatMessages: 0,
  })

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push("/login")
        return
      }
      
      setUser(user)
      setFullName(user.user_metadata?.full_name || "")
      
      // Fetch user stats
      try {
        const { count: favoritesCount } = await supabase
          .from("favorites")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
        
        const { count: bookmarksCount } = await supabase
          .from("bookmarks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
        
        const { count: chatCount } = await supabase
          .from("chat_history")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
        
        setStats({
          favorites: favoritesCount || 0,
          bookmarks: bookmarksCount || 0,
          chatMessages: chatCount || 0,
        })
      } catch (e) {
        console.error("[v0] Error fetching stats:", e)
      }
      
      setIsLoading(false)
    }
    
    fetchUser()
  }, [router])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    })

    if (error) {
      setError(error.message)
      setIsSaving(false)
      return
    }

    setMessage("Profilen er oppdatert!")
    setIsSaving(false)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 gap-3 relative">
      <div className="fixed inset-0 -z-10 w-full h-full">
        <Shader className="w-full h-full">
          <SolidColor color="#27085E" maskType="alpha" />
          <Pixelate scale={15} maskType="alpha" opacity={0.84}>
            <SineWave
              color="#EDF455"
              amplitude={0.87}
              frequency={10.8}
              speed={-0.5}
              angle={6}
              position={{ x: 0.5, y: 0.5 }}
              thickness={0.22}
              softness={0.44}
              maskType="alpha"
            />
          </Pixelate>
        </Shader>
      </div>

      <Card className="w-full max-w-md p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground active:opacity-70 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logg ut
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
            {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold">{fullName || "Brukar"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-3 text-center">
              <Star className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold">{stats.favorites}</div>
              <div className="text-xs text-muted-foreground">Favorittar</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Bookmark className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold">{stats.bookmarks}</div>
              <div className="text-xs text-muted-foreground">Bokmerke</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <MessageSquare className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold">{stats.chatMessages}</div>
              <div className="text-xs text-muted-foreground">Meldingar</div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 mb-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
            {message}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              E-post
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                className="pl-10 h-11 bg-muted"
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium">
              Fullt namn
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ola Nordmann"
                className="pl-10 h-11"
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-11" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Lagrar...
              </>
            ) : (
              "Lagre endringar"
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}
