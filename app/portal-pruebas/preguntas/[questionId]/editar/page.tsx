import { PruebasQuestionEditor } from "@/components/pruebas/questions/pruebas-question-editor"

type PageProps = {
  params: Promise<{ questionId: string }>
}

export default async function PortalPruebasPreguntaEditarPage({
  params,
}: PageProps) {
  const { questionId } = await params
  return <PruebasQuestionEditor mode="edit" questionId={questionId} />
}
