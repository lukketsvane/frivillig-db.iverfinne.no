// Activity tracking utility
"use client"

import { createClient } from "@/lib/supabase/client"

type ActivityType = "view" | "bookmark" | "favorite" | "click" | "search"

interface TrackActivityParams {
  activityType: ActivityType
  organizationId?: string
  metadata?: Record<string, unknown>
}

/**
 * Tracks user activity for analytics and personalization
 */
export async function trackActivity({
  activityType,
  organizationId,
  metadata = {},
}: TrackActivityParams) {
  try {
    const supabase = createClient()
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // Don't track anonymous users
      return
    }

    // Insert activity
    const { error } = await supabase
      .from("user_activity")
      .insert({
        user_id: user.id,
        activity_type: activityType,
        organization_id: organizationId,
        metadata,
      })

    if (error) {
      console.error("[v0] Error tracking activity:", error)
    }
  } catch (error) {
    console.error("[v0] Failed to track activity:", error)
  }
}
