import { Suspense } from "react"

import { PruebasTrackingScreen } from "@/components/pruebas/tracking/pruebas-tracking-screen"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"

export default function PortalPruebasSeguimientoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <LoadingSkeleton rows={5} />
        </div>
      }
    >
      <PruebasTrackingScreen />
    </Suspense>
  )
}
