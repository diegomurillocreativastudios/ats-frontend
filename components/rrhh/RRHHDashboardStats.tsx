import { Users, Briefcase, Calendar, UserCheck } from "lucide-react";

const STAT_CONFIG = [
  {
    value: "245",
    label: "Candidatos Activos",
    icon: Users,
    iconBg: "bg-[#F3E8FF]",
    iconColor: "text-vo-purple",
  },
  {
    value: "12",
    label: "Vacantes Abiertas",
    icon: Briefcase,
    iconBg: "bg-[#F3E8FF]",
    iconColor: "text-vo-purple",
  },
  {
    value: "8",
    label: "Entrevistas Hoy",
    icon: Calendar,
    iconBg: "bg-[#F3E8FF]",
    iconColor: "text-vo-purple",
  },
  {
    value: "23",
    label: "Contrataciones Mes",
    icon: UserCheck,
    iconBg: "bg-[#F3E8FF]",
    iconColor: "text-vo-purple",
  },
];

export default function RRHHDashboardStats({
  compact = false,
  responsiveGrid = false,
}) {
  const gridClass = responsiveGrid
    ? "grid-cols-2 md:grid-cols-4"
    : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div
      className={`grid w-full gap-4 ${gridClass} ${compact ? "gap-3" : "gap-4 md:gap-4"}`}
      aria-label="Estadísticas del dashboard"
    >
      {STAT_CONFIG.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={`rounded-lg border border-border bg-card flex flex-col gap-2 ${
              compact ? "p-3" : "p-4 md:p-4 lg:p-6"
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg md:h-8 md:w-8 ${
                compact ? "h-8 w-8" : "h-10 w-10 lg:h-10 lg:w-10"
              } ${stat.iconBg}`}
            >
              <Icon
                className={`${stat.iconColor} ${compact ? "h-4 w-4" : "h-5 w-5"}`}
                aria-hidden
              />
            </div>
            <span
              className={`font-inter font-bold text-foreground ${
                compact ? "text-xl" : "text-2xl lg:text-[28px]"
              }`}
            >
              {stat.value}
            </span>
            <span className="font-inter text-xs text-muted-foreground md:text-sm">
              {stat.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
