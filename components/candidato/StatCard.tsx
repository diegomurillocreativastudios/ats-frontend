import { Briefcase, Calendar, ClipboardList, Mail } from "lucide-react";
import type { CandidatePortalStats } from "@/lib/candidate-dashboard";

const STAT_CONFIG = [
  {
    key: "activeApplications" as const,
    label: "Postulaciones activas",
    description: "Procesos en los que estás participando actualmente.",
    icon: Briefcase,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    key: "pendingEvaluations" as const,
    label: "Evaluaciones pendientes",
    description: "Pruebas o evaluaciones que debes completar.",
    icon: ClipboardList,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    key: "upcomingInterviews" as const,
    label: "Entrevistas próximas",
    description: "Citas programadas dentro de tu proceso.",
    icon: Calendar,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    key: "unreadMessages" as const,
    label: "Mensajes sin leer",
    description: "Comunicaciones pendientes de revisar.",
    icon: Mail,
    iconBg: "bg-amber-100",
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
  stats = null,
  loading = false,
}: {
  stats?: CandidatePortalStats | null;
  loading?: boolean;
}) {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STAT_CONFIG.map((stat) => {
        const Icon = stat.icon;
        const value = formatStatValue(stats, loading, stat.key);
        return (
          <div
            key={stat.key}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.iconBg}`}
            >
              <Icon className={`h-6 w-6 ${stat.iconColor}`} aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-sans text-3xl font-bold text-foreground">
                {value}
              </span>
              <span className="font-sans text-sm font-semibold text-foreground">
                {stat.label}
              </span>
              <span className="font-sans text-xs leading-relaxed text-muted-foreground">
                {stat.description}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
