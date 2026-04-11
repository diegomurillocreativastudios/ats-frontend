"use client";

import CandidateSidebar from "@/components/candidato/CandidateSidebar";
import CandidateTopbar from "@/components/candidato/CandidateTopbar";
import StatCard from "@/components/candidato/StatCard";
import NextActivitiesCard from "@/components/candidato/NextActivitiesCard";
import MyPostulationsCard from "@/components/candidato/MyPostulationsCard";
import { useCandidateDashboard } from "@/hooks/useCandidateDashboard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getCandidateGreetingFirstName } from "@/lib/candidate-portal-greeting";

export default function CandidatePortalHome() {
  const { data, loading, error } = useCandidateDashboard();
  const { user, loading: userLoading } = useCurrentUser();

  const greetingName = getCandidateGreetingFirstName(
    data?.greetingName ?? null,
    user?.name ?? null,
    user?.email ?? null
  );

  const stats = data?.stats ?? null;
  const activities = data?.activities ?? [];
  const applications = data?.applications ?? [];

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <CandidateSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CandidateTopbar variant="desktop" />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col gap-8 p-8">
              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 font-inter text-sm text-destructive"
                >
                  {error}
                </div>
              ) : null}
              <section aria-label="Bienvenida">
                <h1 className="font-inter text-[28px] font-bold text-foreground">
                  {userLoading && !data && !error
                    ? "Cargando…"
                    : `¡Hola, ${greetingName}! 👋`}
                </h1>
                <p className="mt-2 font-inter text-base text-muted-foreground">
                  Aquí está el resumen de tu proceso de selección
                </p>
              </section>
              <section aria-label="Resumen de estadísticas">
                <StatCard
                  useDesktopLabels
                  stats={stats}
                  loading={loading && !data}
                />
              </section>
              <section
                className="flex flex-col gap-6 lg:flex-row lg:items-start"
                aria-label="Actividades y postulaciones"
              >
                <div className="min-w-0 flex-1">
                  <NextActivitiesCard
                    activities={activities}
                    loading={loading && !data}
                  />
                </div>
                <MyPostulationsCard
                  applications={applications}
                  loading={loading && !data}
                />
              </section>
            </div>
          </main>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <CandidateTopbar variant="tablet" />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 font-inter text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}
            <section aria-label="Bienvenida">
              <h1 className="font-inter text-xl font-bold text-foreground md:text-2xl">
                {userLoading && !data && !error
                  ? "Cargando…"
                  : `¡Hola, ${greetingName}! 👋`}
              </h1>
              <p className="mt-1 font-inter text-[13px] text-muted-foreground md:mt-1.5 md:text-sm">
                <span className="md:hidden">Tu resumen de hoy</span>
                <span className="hidden md:inline">
                  Resumen de tu proceso de selección
                </span>
              </p>
            </section>
            <section aria-label="Resumen de estadísticas">
              <StatCard
                useDesktopLabels={false}
                compact
                responsiveGrid
                stats={stats}
                loading={loading && !data}
              />
            </section>
            <section aria-label="Próximas actividades">
              <NextActivitiesCard
                compact
                activities={activities}
                loading={loading && !data}
              />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
