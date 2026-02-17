import Link from "next/link";
import { Plus } from "lucide-react";
import RRHHSidebar from "@/components/rrhh/RRHHSidebar";
import RRHHTopbar from "@/components/rrhh/RRHHTopbar";
import RRHHDashboardStats from "@/components/rrhh/RRHHDashboardStats";
import RecentCandidatesCard from "@/components/rrhh/RecentCandidatesCard";
import RecentActivityCard from "@/components/rrhh/RecentActivityCard";

export const metadata = {
  title: { absolute: "ATS | Portal RRHH | Dashboard" },
  description: "Dashboard de reclutamiento - Resumen y actividad reciente",
};

export default function PortalRRHHDashboardPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Desktop: sidebar + main */}
      <div className="hidden lg:flex lg:min-h-screen">
        <RRHHSidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <RRHHTopbar variant="desktop" breadcrumbLabel="Dashboard" />
          <main className="flex-1 overflow-auto">
            <div className="flex flex-col gap-8 p-8">
              <section
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                aria-label="Encabezado del dashboard"
              >
                <h1 className="font-inter text-[28px] font-bold text-foreground">
                  Dashboard de Reclutamiento
                </h1>
                <Link
                  href="/portal-rrhh/vacantes/nueva"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-vo-purple px-6 py-3 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                  aria-label="Crear nueva vacante"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Nueva Vacante
                </Link>
              </section>
              <section aria-label="Estadísticas">
                <RRHHDashboardStats />
              </section>
              <section
                className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start"
                aria-label="Candidatos recientes y actividad"
              >
                <RecentCandidatesCard />
                <RecentActivityCard />
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Tablet & Mobile: topbar + content */}
      <div className="flex min-h-screen flex-col lg:hidden">
        <RRHHTopbar variant="tablet" breadcrumbLabel="Dashboard" />
        <main className="flex-1 overflow-auto">
          <div className="flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            <section
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              aria-label="Encabezado del dashboard"
            >
              <h1 className="font-inter text-xl font-bold text-foreground md:text-2xl">
                Dashboard de Reclutamiento
              </h1>
              <Link
                href="/portal-rrhh/vacantes/nueva"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                aria-label="Crear nueva vacante"
              >
                <Plus className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Nueva Vacante</span>
                <span className="sm:hidden" aria-hidden>Nueva</span>
              </Link>
            </section>
            <section aria-label="Estadísticas">
              <RRHHDashboardStats compact responsiveGrid />
            </section>
            <section
              className="flex flex-col gap-6"
              aria-label="Candidatos recientes y actividad"
            >
              <RecentCandidatesCard />
              <RecentActivityCard />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
