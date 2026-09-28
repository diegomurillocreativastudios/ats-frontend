"use client"

import { useTranslations } from "next-intl"

/**
 * Segment error boundary. FE-SEC-022: generic copy only; no raw error.message.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("Errors.boundary")

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-sans text-lg font-semibold text-foreground">
        {t("title")}
      </h1>
      <p className="max-w-md text-center font-sans text-sm text-muted-foreground" role="alert">
        {t("description")}
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          {t("ref", { digest: error.digest })}
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-vo-purple px-4 py-2 font-sans text-sm text-white hover:bg-vo-purple-hover"
        aria-label={t("retry")}
      >
        {t("retry")}
      </button>
    </div>
  )
}
