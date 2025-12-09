import { ArrowLeft } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-[100dvh] w-full bg-black text-white p-4 pb-safe">
      <div className="inline-flex items-center gap-1.5 text-xs text-white/60 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>tilbake</span>
      </div>
      <div className="space-y-6 max-w-2xl animate-pulse">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-6 w-64 bg-white/10 rounded" />
          <div className="flex gap-2">
            <div className="h-6 w-20 bg-white/10 rounded-md" />
            <div className="h-6 w-24 bg-white/10 rounded-md" />
          </div>
        </div>

        {/* Purpose skeleton */}
        <div className="space-y-2 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="h-3 w-16 bg-white/10 rounded" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-white/10 rounded" />
            <div className="h-4 w-5/6 bg-white/10 rounded" />
            <div className="h-4 w-4/6 bg-white/10 rounded" />
          </div>
        </div>

        {/* Contact skeleton */}
        <div className="space-y-3">
          <div className="h-3 w-20 bg-white/10 rounded" />
          <div className="space-y-2">
            <div className="h-12 w-full bg-white/5 rounded-lg border border-white/10" />
            <div className="h-12 w-full bg-white/5 rounded-lg border border-white/10" />
          </div>
        </div>

        {/* Info skeleton */}
        <div className="space-y-3">
          <div className="h-3 w-32 bg-white/10 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-16 bg-white/5 rounded-lg border border-white/10" />
            <div className="h-16 bg-white/5 rounded-lg border border-white/10" />
          </div>
        </div>
      </div>
    </div>
  )
}
