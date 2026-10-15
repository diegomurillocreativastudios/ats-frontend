import { Suspense } from "react"

import { PruebasResultsDetailScreen } from "@/components/pruebas/results/pruebas-results-detail-screen"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"

export default function PortalPruebasResultadosDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <LoadingSkeleton rows={6} />
        </div>
      }
    >
      <PruebasResultsDetailScreen />
    </Suspense>
  )
}
