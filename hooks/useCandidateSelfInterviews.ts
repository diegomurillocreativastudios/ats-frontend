"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getCandidateSelfInterviews,
  getInterviewHttpErrorMessage,
  type Interview,
} from "@/lib/api/interviews"

export function useCandidateSelfInterviews() {
  const [items, setItems] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await getCandidateSelfInterviews()
      setItems(list)
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status?: number }).status)
          : 0
      setError(getInterviewHttpErrorMessage(status, err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { items, loading, error, refetch: load }
}
