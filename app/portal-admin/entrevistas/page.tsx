"use client"

import { useState } from "react"
import { Calendar, ListChecks, Tags } from "lucide-react"
import { InterviewStatusesCrudModal } from "@/components/rrhh/interviews/interview-statuses-crud-modal"
import { InterviewTypesCrudModal } from "@/components/rrhh/interviews/interview-types-crud-modal"

export default function PortalAdminEntrevistasPage() {
  const [interviewTypesModalOpen, setInterviewTypesModalOpen] = useState(false)
  const [interviewStatusesModalOpen, setInterviewStatusesModalOpen] =
    useState(false)

  return (
    <div className="min-w-0 flex flex-col">
      <InterviewTypesCrudModal
        isOpen={interviewTypesModalOpen}
        onClose={() => setInterviewTypesModalOpen(false)}
      />
      <InterviewStatusesCrudModal
        isOpen={interviewStatusesModalOpen}
        onClose={() => setInterviewStatusesModalOpen(false)}
      />
      <section
        className="flex flex-col gap-6 border-b border-border px-4 py-6 md:px-8"
        aria-label="Configuración de entrevistas"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vo-purple/10"
              aria-hidden
            >
              <Calendar className="h-5 w-5 text-vo-purple" />
            </div>
            <h1 className="font-inter text-2xl font-bold text-foreground">
              Entrevistas
            </h1>
          </div>
          <p className="max-w-2xl font-inter text-sm text-muted-foreground">
            Definí los tipos y estados de entrevista que usarán los reclutadores
            al agendar y dar seguimiento en el portal RRHH.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setInterviewTypesModalOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent bg-vo-magenta px-5 py-3 font-inter text-sm font-medium text-white shadow-sm transition-colors hover:bg-vo-magenta-hover focus:outline-none focus:ring-2 focus:ring-vo-magenta focus:ring-offset-2"
          >
            <Tags className="h-4 w-4 shrink-0" aria-hidden />
            Tipos de entrevista
          </button>
          <button
            type="button"
            onClick={() => setInterviewStatusesModalOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent bg-vo-pink px-5 py-3 font-inter text-sm font-medium text-white shadow-sm transition-colors hover:bg-vo-pink-hover focus:outline-none focus:ring-2 focus:ring-vo-pink focus:ring-offset-2"
          >
            <ListChecks className="h-4 w-4 shrink-0" aria-hidden />
            Estados de entrevista
          </button>
        </div>
      </section>
    </div>
  )
}
