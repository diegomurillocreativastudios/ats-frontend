export default function EntrevistasVacancyLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
        aria-hidden
      />
      <p className="font-sans text-sm text-muted-foreground">Cargando…</p>
    </div>
  )
}
