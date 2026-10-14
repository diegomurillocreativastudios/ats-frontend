import { Suspense } from "react"

import { PruebasResultsListScreen } from "@/components/pruebas/results/pruebas-results-list-screen"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"

export default function PortalPruebasResultadosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <LoadingSkeleton rows={5} />
        </div>
      }
    >
      <PruebasResultsListScreen />
    </Suspense>
  )
}
