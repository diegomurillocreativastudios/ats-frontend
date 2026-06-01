"use client"

import { useEffect, useState } from "react"

export interface ToastProps {
  type: "success" | "error" | "info" | "warning"
  message: string
  duration?: number
}

const typeClasses: Record<ToastProps["type"], string> = {
  success:
    "border-emerald-700 bg-emerald-50 text-emerald-700",
  error: "border-red-700 bg-red-50 text-red-700",
  info: "border-border bg-muted text-foreground",
  warning:
    "border-amber-700 bg-amber-50 text-amber-700",
}

export function Toast({ type, message, duration = 5000 }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(t)
  }, [duration])

  if (!visible) return null

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${typeClasses[type]}`}
      role="status"
    >
      {message}
    </div>
  )
}
