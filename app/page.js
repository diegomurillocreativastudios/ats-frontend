import Link from "next/link";

export const metadata = {
  title: { absolute: "ATS | Inicio" },
  description: "Selecciona el portal al que deseas acceder",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col items-center justify-center p-6">
      <h1 className="font-inter text-2xl font-bold text-foreground mb-2 text-center">
        ATS
      </h1>
      <p className="font-inter text-muted-foreground mb-8 text-center">
        Selecciona el portal al que deseas acceder
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/portal-candidato"
          className="inline-flex items-center justify-center rounded-lg bg-vo-navy px-6 py-3 font-inter text-sm font-bold text-white transition-colors hover:bg-vo-navy/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          aria-label="Ir al Portal Candidato"
          tabIndex={0}
        >
          Portal Candidato
        </Link>
        <Link
          href="/portal-rrhh"
          className="inline-flex items-center justify-center rounded-lg bg-vo-sky px-6 py-3 font-inter text-sm font-bold text-white transition-colors hover:bg-vo-sky/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          aria-label="Ir al Portal RRHH"
          tabIndex={0}
        >
          Portal RRHH
        </Link>
      </div>
    </div>
  );
}
