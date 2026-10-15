import { PruebasEvaluationDetail } from "@/components/pruebas/evaluations/pruebas-evaluation-detail"

interface PortalPruebasEvaluationDetailPageProps {
  params: Promise<{ testId: string }>
}

export default async function PortalPruebasEvaluationDetailPage({
  params,
}: PortalPruebasEvaluationDetailPageProps) {
  const { testId } = await params
  return <PruebasEvaluationDetail testId={testId} />
}
