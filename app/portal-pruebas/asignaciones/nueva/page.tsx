import { Suspense } from "react"

import { PruebasAssignmentsScreen } from "@/components/pruebas/assignments/pruebas-assignments-screen"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"

export default function PortalPruebasAsignacionesNuevaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <LoadingSkeleton rows={5} />
        </div>
      }
    >
      <PruebasAssignmentsScreen />
    </Suspense>
  )
}
