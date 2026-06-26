"use client"

import { useEffect, useMemo, useState } from "react"
import { Lightbulb } from "lucide-react"
import { useTranslations } from "next-intl"
import { publicOpportunitiesTheme } from "@/lib/public-opportunities-theme"

const TIP_ROTATION_INTERVAL = 7000

const TIP_KEYS = [
  "tip1",
  "tip2",
  "tip3",
  "tip4",
  "tip5",
  "tip6",
  "tip7",
  "tip8",
  "tip9",
  "tip10",
] as const

function getRandomTipIndex(excludeIndex?: number, total: number = TIP_KEYS.length): number {
  const availableIndices = Array.from({ length: total }, (_, i) => i).filter(
    (i) => i !== excludeIndex
  )
  return (
    availableIndices[Math.floor(Math.random() * availableIndices.length)] ?? 0
  )
}

interface ApplicationTipsWidgetProps {
  position?: "left" | "right"
}

export function ApplicationTipsWidget({
  position = "left",
}: ApplicationTipsWidgetProps = {}) {
  const t = useTranslations("PublicOpportunities.tips")
  const tips = useMemo(() => TIP_KEYS.map((key) => t(key)), [t])
  const [currentTipIndex, setCurrentTipIndex] = useState(() =>
    getRandomTipIndex(undefined, tips.length)
  )
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsVisible(false)

      setTimeout(() => {
        setCurrentTipIndex((prev) => getRandomTipIndex(prev, tips.length))
        setIsVisible(true)
      }, 300)
    }, TIP_ROTATION_INTERVAL)

    return () => clearInterval(intervalId)
  }, [tips.length])

  const positionClassName = position === "right" ? "right-6" : "left-6"
  const currentTip = tips[currentTipIndex] ?? tips[0] ?? ""

  return (
    <aside
      className={`fixed bottom-6 ${positionClassName} z-40 w-[320px] max-w-[calc(100vw-3rem)] sm:w-[380px]`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`${publicOpportunitiesTheme.tipsWidget} backdrop-blur-xl transition-opacity duration-300`}
        style={{ opacity: isVisible ? 1 : 0 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-ats-terracotta/6 via-transparent to-transparent" />

        <div className="relative p-5">
          <div className="flex items-start gap-3.5">
            <div className={publicOpportunitiesTheme.tipsIconSurface}>
              <Lightbulb
                className="h-5 w-5 text-ats-terracotta"
                aria-hidden="true"
              />
            </div>

            <div className="flex-1 space-y-1.5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                {t("title")}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{currentTip}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
