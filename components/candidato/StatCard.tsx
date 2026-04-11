import { Briefcase, ClipboardList, Calendar, Mail } from "lucide-react";
import type { CandidatePortalStats } from "@/lib/candidate-dashboard";

const STAT_CONFIG = [
  {
    key: "activeApplications" as const,
    label: "Postulaciones",
    labelDesktop: "Postulaciones Activas",
    icon: Briefcase,
    iconBg: "bg-[#F3E8FF]",
    iconColor: "text-vo-purple",
  },
  {
    key: "pendingEvaluations" as const,
    label: "Evaluaciones",
    labelDesktop: "Evaluaciones Pendientes",
    icon: ClipboardList,
    iconBg: "bg-[#DBEAFE]",
    iconColor: "text-vo-navy",
  },
  {
    key: "upcomingInterviews" as const,
    label: "Entrevistas",
    labelDesktop: "Entrevista Próxima",
    icon: Calendar,
    iconBg: "bg-[#DCFCE7]",
    iconColor: "text-success",
  },
  {
    key: "unreadMessages" as const,
    label: "Mensajes",
    labelDesktop: "Mensajes Sin Leer",
    icon: Mail,
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-amber-600",
  },
];

function formatStatValue(
  stats: CandidatePortalStats | null | undefined,
  loading: boolean,
  key: keyof CandidatePortalStats
) {
  if (loading) return "—"
  if (!stats) return "0"
  const n = stats[key]
  return Number.isFinite(n) ? String(n) : "0"
}

export default function StatCard({
  useDesktopLabels = false,
  compact = false,
  /** When true, use 2 cols on mobile and 4 on md+ (tablet/mobile layout). When false, use 4 cols on lg (desktop). */
  responsiveGrid = false,
  stats = null,
  loading = false,
}: {
  useDesktopLabels?: boolean;
  compact?: boolean;
  responsiveGrid?: boolean;
  stats?: CandidatePortalStats | null;
  loading?: boolean;
}) {
  const gridClass = responsiveGrid
    ? "grid-cols-2 md:grid-cols-4"
    : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div
      className={`grid w-full gap-4 ${gridClass} ${
        compact ? "gap-3" : "gap-4 md:gap-4"
      }`}
    >
      {STAT_CONFIG.map((stat) => {
        const Icon = stat.icon;
        const label = useDesktopLabels ? stat.labelDesktop : stat.label;
        const value = formatStatValue(stats, loading, stat.key);
        return (
          <div
            key={stat.key}
            className={`rounded-lg border border-border bg-card ${
              compact ? "p-3" : "p-4 md:p-4 lg:p-6"
            } flex flex-col gap-2`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg md:h-8 md:w-8 ${
                compact ? "h-8 w-8" : "h-10 w-10 lg:h-10 lg:w-10"
              } ${stat.iconBg}`}
            >
              <Icon
                className={`${stat.iconColor} ${
                  compact ? "h-4 w-4" : "h-5 w-5"
                }`}
                aria-hidden
              />
            </div>
            <span
              className={`font-inter font-bold text-foreground ${
                compact ? "text-xl" : "text-2xl lg:text-[28px]"
              }`}
            >
              {value}
            </span>
            <span className="font-inter text-xs text-muted-foreground md:text-xs lg:text-sm">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
