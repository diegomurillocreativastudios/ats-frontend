"use client"

import { Minus } from "lucide-react"

interface EmptyValueProps {
  message: string
  compact?: boolean
}

export function EmptyValue({ message, compact = false }: EmptyValueProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans text-muted-foreground ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <Minus className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
      <span>{message}</span>
    </span>
  )
}
