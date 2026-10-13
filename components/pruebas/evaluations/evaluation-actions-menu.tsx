"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

import type { EvaluationAction } from "@/lib/pruebas/evaluations"

export interface EvaluationActionsMenuProps {
  title: string
  openLabel: string
  actions: readonly EvaluationAction[]
  labels: Record<Exclude<EvaluationAction, "view">, string>
  actionLinks: Partial<Record<EvaluationAction, string>>
  onAction: (action: EvaluationAction) => void
}

const MENU_ACTIONS: readonly Exclude<EvaluationAction, "view">[] = [
  "edit",
  "duplicate",
  "publish",
  "archive",
  "versions",
]

export function EvaluationActionsMenu({
  title,
  openLabel,
  actions,
  labels,
  actionLinks,
  onAction,
}: EvaluationActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  const visible = MENU_ACTIONS.filter((action) => actions.includes(action))

  useEffect(() => {
    if (!isOpen) return

    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointer)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [isOpen])

  if (visible.length === 0) {
    return null
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className="inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={openLabel}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="sr-only">{title}</span>
        <ChevronDown className="size-4" aria-hidden />
      </button>
      {isOpen ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-44 rounded-md border border-border bg-card py-1 shadow-md"
        >
          {visible.map((action) => {
            const href = actionLinks[action]
            const label = labels[action]
            if (href) {
              return (
                <li key={action} role="none">
                  <Link
                    role="menuitem"
                    href={href}
                    className="block min-h-11 px-3 py-2 font-sans text-sm text-foreground hover:bg-muted focus:outline-none focus-visible:bg-muted"
                    onClick={() => setIsOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              )
            }
            return (
              <li key={action} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full min-h-11 items-center px-3 py-2 text-left font-sans text-sm text-foreground hover:bg-muted focus:outline-none focus-visible:bg-muted"
                  onClick={() => {
                    setIsOpen(false)
                    onAction(action)
                  }}
                >
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
