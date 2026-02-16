"use client";

import Link from "next/link";
import { ClipboardList, Calendar } from "lucide-react";

const MOCK_ACTIVITIES = [
  {
    id: "1",
    title: "Evaluación Técnica - Desarrollador Senior",
    date: "Vence: 15 Feb 2026",
    dateShort: "Vence: 15 Feb",
    source: "Evalart",
    status: "Pendiente",
    statusStyle: "bg-[#FEF3C7] text-amber-800",
    icon: ClipboardList,
    iconBg: "bg-[#DBEAFE]",
    iconColor: "text-vo-navy",
  },
  {
    id: "2",
    title: "Entrevista con Hiring Manager",
    titleShort: "Entrevista con Hiring Manager",
    date: "18 Feb 2026 • 10:00 AM • Google Meet",
    dateShort: "18 Feb • 10:00",
    status: "Confirmada",
    statusStyle: "bg-[#DBEAFE] text-blue-900",
    icon: Calendar,
    iconBg: "bg-[#DCFCE7]",
    iconColor: "text-success",
  },
];

export default function NextActivitiesCard({ compact = false }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 md:p-5 lg:p-6">
      <div className="mb-4 flex items-center justify-between md:mb-4 lg:mb-4">
        <h2 className="font-inter text-base font-semibold text-foreground md:text-base lg:text-lg">
          Próximas Actividades
        </h2>
        <Link
          href="/candidato/evaluaciones"
          className="font-inter text-xs font-medium text-vo-purple hover:underline md:text-sm"
        >
          Ver todas
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {MOCK_ACTIVITIES.map((act) => {
          const Icon = act.icon;
          return (
            <div
              key={act.id}
              className="flex items-center gap-3 rounded-lg bg-muted p-3 md:gap-3 md:p-3"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md md:h-9 md:w-9 ${act.iconBg}`}
              >
                <Icon
                  className={`h-4 w-4 md:h-[18px] md:w-[18px] ${act.iconColor}`}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-inter font-medium text-foreground ${
                    compact ? "text-xs" : "text-sm md:text-[13px]"
                  }`}
                >
                  {compact ? "Evaluación Técnica" : act.title}
                </p>
                <p className="font-inter text-[10px] text-muted-foreground md:text-xs">
                  {compact ? act.dateShort : act.date}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-xl px-2.5 py-1 font-inter text-[10px] font-medium md:px-2.5 md:py-1 md:text-xs ${act.statusStyle}`}
              >
                {act.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
