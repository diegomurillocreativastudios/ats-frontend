import { PruebasCandidateScreen } from "@/components/pruebas/candidate/pruebas-candidate-screen"

type PageProps = {
  params: Promise<{ demoToken: string }>
}

export default async function PruebasCandidateDemoPage({ params }: PageProps) {
  const { demoToken } = await params
  return <PruebasCandidateScreen demoToken={demoToken} />
}
