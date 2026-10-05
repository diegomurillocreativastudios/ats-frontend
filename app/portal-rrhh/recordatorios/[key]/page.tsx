import { getTranslations } from "next-intl/server"
import { ReminderDetailView } from "@/components/rrhh/dashboard/reminder-detail-view"
import { isDashboardReminderKey } from "@/lib/rrhh/recruiter-dashboard"

interface PageProps {
  params: Promise<{ key: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { key } = await params
  const tMeta = await getTranslations("Metadata.recruiterDashboard")
  const tDetail = await getTranslations("RecruiterPortal.dashboard.reminderDetail")
  if (!isDashboardReminderKey(key)) {
    return {
      title: tDetail("metadata.invalidTitle"),
      description: tDetail("metadata.invalidDescription"),
    }
  }
  const t = await getTranslations("RecruiterPortal.dashboard")
  return {
    title: tDetail("metadata.title", { label: t(`reminders.${key}.title`) }),
    description: tMeta("description"),
  }
}

export default async function RecordatorioDetallePage({ params }: PageProps) {
  const { key } = await params
  return <ReminderDetailView rawKey={key} />
}
