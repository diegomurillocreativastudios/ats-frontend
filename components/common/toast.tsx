"use client"

import { useEffect, useState } from "react"

export interface ToastProps {
  type: "success" | "error" | "info" | "warning"
  message: string
  duration?: number
}

const typeClasses: Record<ToastProps["type"], string> = {
  success:
    "border-green-400 bg-green-400 text-white",
  error: "border-red-400 bg-red-400 text-white",
  info: "border-blue-400 bg-blue-400 text-white",
  warning:
    "border-yellow-500 bg-yellow-500 text-white",
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
