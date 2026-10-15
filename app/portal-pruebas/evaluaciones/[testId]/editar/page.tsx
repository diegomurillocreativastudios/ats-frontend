import { PruebasEvaluationEditor } from "@/components/pruebas/evaluations/pruebas-evaluation-editor"

interface PortalPruebasEvaluationEditPageProps {
  params: Promise<{ testId: string }>
}

export default async function PortalPruebasEvaluationEditPage({
  params,
}: PortalPruebasEvaluationEditPageProps) {
  const { testId } = await params
  return <PruebasEvaluationEditor mode="edit" testId={testId} />
}
