import { UserCheck, Calendar, ClipboardList } from "lucide-react";

const ACTIVITY_ITEMS = [
  {
    text: "Ana López fue contratada",
    time: "Hace 2 horas",
    icon: UserCheck,
    iconBg: "bg-vo-navy",
  },
  {
    text: "Entrevista con María Castro",
    time: "Hace 4 horas",
    icon: Calendar,
    iconBg: "bg-vo-navy",
  },
  {
    text: "Juan Pérez completó evaluación",
    time: "Hace 6 horas",
    icon: ClipboardList,
    iconBg: "bg-vo-yellow",
  },
];

export default function RecentActivityCard() {
  return (
    <div
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
      aria-label="Actividad reciente"
    >
      <h2 className="font-inter text-base font-semibold text-foreground">
        Actividad Reciente
      </h2>
      <ul className="flex flex-col gap-4">
        {ACTIVITY_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.text} className="flex items-start gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.iconBg}`}
                aria-hidden
              >
                <Icon className="h-4 w-4 text-white" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-inter text-[13px] font-medium text-foreground">
                  {item.text}
                </p>
                <p className="font-inter text-[11px] text-muted-foreground">
                  {item.time}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
