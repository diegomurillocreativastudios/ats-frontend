import CandidateSidebar from "@/components/candidato/CandidateSidebar";
import CandidateTopbar from "@/components/candidato/CandidateTopbar";
import StatCard from "@/components/candidato/StatCard";
import NextActivitiesCard from "@/components/candidato/NextActivitiesCard";
import MyPostulationsCard from "@/components/candidato/MyPostulationsCard";

export const metadata = {
  title: { absolute: "ATS | Portal Candidato" },
  description: "Portal del candidato - Resumen de tu proceso de selección",
};

export default function CandidatePortalHomePage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Desktop: sidebar + main */}
      <div className="hidden lg:flex lg:min-h-screen">
        <CandidateSidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <CandidateTopbar variant="desktop" />
          <main className="flex-1 overflow-auto">
            <div className="flex flex-col gap-8 p-8">
              <section aria-label="Bienvenida">
                <h1 className="font-inter text-[28px] font-bold text-foreground">
                  ¡Hola, María! 👋
                </h1>
                <p className="mt-2 font-inter text-base text-muted-foreground">
                  Aquí está el resumen de tu proceso de selección
                </p>
              </section>
              <section aria-label="Resumen de estadísticas">
                <StatCard useDesktopLabels />
              </section>
              <section
                className="flex flex-col gap-6 lg:flex-row lg:items-start"
                aria-label="Actividades y postulaciones"
              >
                <div className="min-w-0 flex-1">
                  <NextActivitiesCard />
                </div>
                <MyPostulationsCard />
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Tablet & Mobile: topbar + content */}
      <div className="flex min-h-screen flex-col lg:hidden">
        <CandidateTopbar variant="tablet" />
        <main className="flex-1 overflow-auto">
          <div className="flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            <section aria-label="Bienvenida">
              <h1 className="font-inter text-xl font-bold text-foreground md:text-2xl">
                ¡Hola, María! 👋
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
              />
            </section>
            <section aria-label="Próximas actividades">
              <NextActivitiesCard compact />
            </section>
          </div>
        </main>
      </div>

      {/* Mobile: same as tablet but with smaller padding/text - we use same block with responsive classes */}
      {/* Already covered by md: above; we only adjust padding and welcome text via responsive utilities */}
    </div>
  );
}
