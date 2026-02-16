"use client";

import Link from "next/link";

const MOCK_POSTULATIONS = [
  {
    id: "1",
    title: "Desarrollador Full Stack",
    company: "TechCorp SA • Remoto",
    status: "En proceso",
    statusStyle: "bg-[#DBEAFE] text-blue-900",
    progress: 2,
    total: 4,
  },
  {
    id: "2",
    title: "Product Manager",
    company: "InnovateTech • CDMX",
    status: "Evaluación",
    statusStyle: "bg-[#DCFCE7] text-green-800",
    progress: 1,
    total: 4,
  },
];

export default function MyPostulationsCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 lg:p-6 lg:min-w-[320px] lg:max-w-[400px]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-inter text-base font-semibold text-foreground lg:text-lg">
          Mis Postulaciones
        </h2>
        <Link
          href="/candidato/estado"
          className="font-inter text-xs font-medium text-vo-purple hover:underline lg:text-sm"
        >
          Ver todas
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {MOCK_POSTULATIONS.map((post) => (
          <div
            key={post.id}
            className="flex flex-col gap-2 rounded-lg bg-muted p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-inter text-sm font-medium text-foreground">
                {post.title}
              </p>
              <span
                className={`shrink-0 rounded-xl px-2.5 py-1 font-inter text-xs font-medium ${post.statusStyle}`}
              >
                {post.status}
              </span>
            </div>
            <p className="font-inter text-xs text-muted-foreground">
              {post.company}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: post.total }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-sm ${
                    i < post.progress ? "bg-vo-purple" : "bg-border"
                  }`}
                  role="progressbar"
                  aria-valuenow={post.progress}
                  aria-valuemin={0}
                  aria-valuemax={post.total}
                  aria-label={`Progreso ${post.progress} de ${post.total} pasos`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
