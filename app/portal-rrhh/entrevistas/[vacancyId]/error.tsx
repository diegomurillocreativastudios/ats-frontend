"use client"

export default function EntrevistasVacancyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <p className="font-inter text-sm text-destructive" role="alert">
        {error.message || "Ocurrió un error al cargar las entrevistas."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-vo-purple px-4 py-2 font-inter text-sm text-white hover:bg-vo-purple-hover"
      >
        Reintentar
      </button>
    </div>
  )
}
