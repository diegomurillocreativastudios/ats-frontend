import { Suspense } from "react"
import { InterviewDetailPageClient } from "./interview-detail-page-client"

function InterviewDetailFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
        aria-hidden
      />
      <p className="font-sans text-sm text-muted-foreground">Cargando entrevista…</p>
    </div>
  )
}

export default function InterviewDetailPage() {
  return (
    <Suspense fallback={<InterviewDetailFallback />}>
      <InterviewDetailPageClient />
    </Suspense>
  )
}
