"use client"

import { useTranslations } from "next-intl"
import { StarRating } from "@/components/ui/StarRating"
import { MessageSquare } from "lucide-react"

interface VacancyFinishedSummaryProps {
  calification: number | null
  comments: string | null
}

export function VacancyFinishedSummary({
  calification,
  comments,
}: VacancyFinishedSummaryProps) {
  const t = useTranslations("RecruiterPortal.vacancies.detail.finishedSummary")

  if (calification == null && (comments == null || comments.trim() === "")) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
      <h3 className="font-sans text-sm font-semibold text-emerald-950">
        {t("title")}
      </h3>

      {calification != null && calification >= 1 && calification <= 5 && (
        <div className="flex flex-col gap-2">
          <p className="font-sans text-xs font-medium text-emerald-900">
            {t("ratingLabel")}
          </p>
          <div className="flex items-center gap-3">
            <StarRating value={calification} readonly size="md" />
            <span className="font-sans text-sm text-emerald-800">
              {calification === 1
                ? t("ratingValueSingular", { rating: calification })
                : t("ratingValue", { rating: calification })}
            </span>
          </div>
        </div>
      )}

      {comments != null && comments.trim() !== "" && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 font-sans text-xs font-medium text-emerald-900">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            {t("commentsLabel")}
          </p>
          <p className="font-sans text-sm leading-relaxed text-emerald-900/90 whitespace-pre-wrap">
            {comments.trim()}
          </p>
        </div>
      )}
    </div>
  )
}
