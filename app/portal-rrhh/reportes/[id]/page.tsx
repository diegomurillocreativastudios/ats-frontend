import { ReportTemplateDetailClient } from "@/components/rrhh/reportes/report-template-detail-client"

interface ReportTemplatePageProps {
  params: Promise<{ id: string }>
}

export default async function ReportTemplatePage({ params }: ReportTemplatePageProps) {
  const { id } = await params
  return <ReportTemplateDetailClient templateId={id ?? ""} />
}
