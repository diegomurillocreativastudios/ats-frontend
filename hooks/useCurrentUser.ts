"use client"

import { useState, useEffect } from "react"

interface CurrentUser {
  id: string | null
  name: string
  email: string
  role?: string | null
}

/**
 * Returns the currently logged-in user from GET /api/auth/me only.
 * Fail-closed: never reads identity from the `ats_user` cookie.
 */
export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" })
        if (cancelled) return
        if (res.ok) {
          const data = (await res.json()) as CurrentUser
          setUser(data)
          return
        }
        setUser(null)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { user, loading }
}
