import { Suspense } from "react"

import { PruebasReviewDetailScreen } from "@/components/pruebas/review/pruebas-review-detail-screen"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"

export default function PortalPruebasRevisionDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <LoadingSkeleton rows={6} />
        </div>
      }
    >
      <PruebasReviewDetailScreen />
    </Suspense>
  )
}
