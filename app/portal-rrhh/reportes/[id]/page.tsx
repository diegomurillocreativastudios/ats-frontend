import { ReportByKeyResolverClient } from "@/components/rrhh/reportes/report-by-key-resolver-client"

interface ReportByKeyPageProps {
  params: Promise<{ id: string }>
}

/**
 * `/portal-rrhh/reportes/:id` — `id` is the catalog `reportKey` (e.g.
 * `vacancy-progress-by-client`). Numeric ids still resolve as legacy template ids.
 */
export default async function ReportByKeyPage({ params }: ReportByKeyPageProps) {
  const { id } = await params
  return <ReportByKeyResolverClient reportKey={id ?? ""} />
}
