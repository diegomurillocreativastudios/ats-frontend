"use client"

import { Sparkles } from "lucide-react"

interface ChangeConnectorProps {
  isHighlighted?: boolean
}

export function ChangeConnector({ isHighlighted = false }: ChangeConnectorProps) {
  return (
    <div
      className="relative hidden items-stretch justify-center lg:flex"
      aria-hidden
    >
      <div className="flex flex-col items-center py-6">
        <div className="h-3 w-px bg-gradient-to-b from-transparent via-border to-border" />
        <div
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-sm motion-safe:transition-all motion-safe:duration-200 ${
            isHighlighted
              ? "border-vo-purple/40 bg-vo-purple/10 text-vo-purple shadow-vo-purple/10"
              : "border-border bg-white text-muted-foreground"
          }`}
        >
          <Sparkles className={`h-3.5 w-3.5 ${isHighlighted ? "opacity-100" : "opacity-60"}`} />
          {isHighlighted ? (
            <span className="absolute inset-0 rounded-full bg-vo-purple/20 blur-md motion-safe:animate-pulse motion-reduce:animate-none" />
          ) : null}
        </div>
        <div className="min-h-[1.5rem] w-px flex-1 bg-gradient-to-b from-border via-border/60 to-transparent" />
      </div>
    </div>
  )
}
