import { PruebasEvaluationVersions } from "@/components/pruebas/evaluations/pruebas-evaluation-versions"

interface PortalPruebasEvaluationVersionsPageProps {
  params: Promise<{ testId: string }>
}

export default async function PortalPruebasEvaluationVersionsPage({
  params,
}: PortalPruebasEvaluationVersionsPageProps) {
  const { testId } = await params
  return <PruebasEvaluationVersions testId={testId} />
}
