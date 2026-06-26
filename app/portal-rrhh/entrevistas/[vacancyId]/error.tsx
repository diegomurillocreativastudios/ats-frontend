"use client"

import { useTranslations } from "next-intl"

export default function EntrevistasVacancyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("RecruiterPortal.interviews")
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <p className="font-sans text-sm text-destructive" role="alert">
        {error.message || t("errors.loadInterviewsFailed")}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-vo-purple px-4 py-2 font-sans text-sm text-white hover:bg-vo-purple-hover"
      >
        {t("actions.retry")}
      </button>
    </div>
  )
}
