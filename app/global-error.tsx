"use client"

/**
 * Root error boundary. Must include its own html/body because it replaces
 * the root layout. FE-SEC-022: never render raw exception messages.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <h1 className="font-sans text-lg font-semibold text-slate-900">
            Algo salió mal
          </h1>
          <p className="max-w-md text-center font-sans text-sm text-slate-600" role="alert">
            No pudimos mostrar esta página. Podés reintentar o volver más tarde.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-slate-400">
              Ref: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-[#5b2d8e] px-4 py-2 font-sans text-sm text-white hover:opacity-90"
            aria-label="Reintentar"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
