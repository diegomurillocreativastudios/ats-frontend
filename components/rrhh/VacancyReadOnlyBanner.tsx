import { Eye, CheckCircle2 } from "lucide-react"
import { useTranslations } from "next-intl"
import type { VacancyRecruiterReadOnlyReason } from "@/lib/vacancies/read-vacancy-recruiter-read-only"

interface VacancyReadOnlyBannerProps {
  reason?: VacancyRecruiterReadOnlyReason
}

const BANNER_STYLES = {
  vacancy: {
    icon: Eye,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-950",
    iconColor: "text-amber-700",
    bodyTextColor: "text-amber-900/90",
    copyKey: "vacancy",
  },
  company: {
    icon: Eye,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-950",
    iconColor: "text-amber-700",
    bodyTextColor: "text-amber-900/90",
    copyKey: "company",
  },
  done: {
    icon: CheckCircle2,
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-950",
    iconColor: "text-emerald-700",
    bodyTextColor: "text-emerald-900/90",
    copyKey: "done",
  },
} as const

export function VacancyReadOnlyBanner({ reason = "vacancy" }: VacancyReadOnlyBannerProps) {
  const t = useTranslations("RecruiterPortal.vacancies.detail.readOnlyBanner")
  const style = reason === "done" ? BANNER_STYLES.done : reason === "company" ? BANNER_STYLES.company : BANNER_STYLES.vacancy
  const Icon = style.icon

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border ${style.borderColor} ${style.bgColor} px-4 py-3 ${style.textColor}`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`} aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <p className="font-sans text-sm font-semibold">{t(`${style.copyKey}.title`)}</p>
        <p className={`font-sans text-sm ${style.bodyTextColor}`}>{t(`${style.copyKey}.body`)}</p>
      </div>
    </div>
  )
}
