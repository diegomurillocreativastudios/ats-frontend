"use client"

import { useTranslations } from "next-intl"
import { Download, Eye, Sparkles, User } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface ComparisonActionsProps {
  onViewOriginal?: () => void
  onViewAdapted?: () => void
  onApplyAdapted?: () => void
  onExportComparison?: () => void
  applying?: boolean
  showApply?: boolean
}

export function ComparisonActions({
  onViewOriginal,
  onViewAdapted,
  onApplyAdapted,
  onExportComparison,
  applying = false,
  showApply = true,
}: ComparisonActionsProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison.dashboard")

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex flex-1 flex-wrap gap-2">
        {onViewOriginal ? (
          <Button type="button" variant="outline" onClick={onViewOriginal} className="px-4 py-2.5">
            <User className="h-4 w-4" aria-hidden />
            {t("viewOriginalCv")}
          </Button>
        ) : null}
        {onViewAdapted ? (
          <Button type="button" variant="outline" onClick={onViewAdapted} className="px-4 py-2.5">
            <Eye className="h-4 w-4" aria-hidden />
            {t("viewAdaptedCv")}
          </Button>
        ) : null}
        {onExportComparison ? (
          <Button type="button" variant="ghost" onClick={onExportComparison} className="px-4 py-2.5">
            <Download className="h-4 w-4" aria-hidden />
            {t("exportComparison")}
          </Button>
        ) : null}
      </div>
      {showApply && onApplyAdapted ? (
        <Button
          type="button"
          onClick={onApplyAdapted}
          disabled={applying}
          aria-busy={applying}
          className="w-full px-4 py-2.5 sm:w-auto"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {applying ? t("applying") : t("applyAdaptedVersion")}
        </Button>
      ) : null}
    </div>
  )
}
