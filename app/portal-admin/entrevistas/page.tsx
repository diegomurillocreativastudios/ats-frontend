"use client"

import { useState } from "react"
import { ListChecks, Tags, Video } from "lucide-react"
import { InterviewModalitiesCrudModal } from "@/components/rrhh/interviews/interview-modalities-crud-modal"
import { InterviewStatusesCrudModal } from "@/components/rrhh/interviews/interview-statuses-crud-modal"
import { InterviewTypesCrudModal } from "@/components/rrhh/interviews/interview-types-crud-modal"
import PortalPageHeader from "@/components/ui/PortalPageHeader"

export default function PortalAdminEntrevistasPage() {
  const [interviewTypesModalOpen, setInterviewTypesModalOpen] = useState(false)
  const [interviewStatusesModalOpen, setInterviewStatusesModalOpen] =
    useState(false)
  const [interviewModalitiesModalOpen, setInterviewModalitiesModalOpen] =
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
      <InterviewModalitiesCrudModal
        isOpen={interviewModalitiesModalOpen}
        onClose={() => setInterviewModalitiesModalOpen(false)}
      />
      <section
        className="px-4 py-6 md:px-8"
        aria-label="Configuración de entrevistas"
      >
        <PortalPageHeader
          title="Entrevistas"
          description="Definí los tipos, modalidades y estados de entrevista que usarán los reclutadores al agendar y dar seguimiento en el portal RRHH."
          contentClassName="max-w-3xl"
          actions={
            <>
              <button
                type="button"
                onClick={() => setInterviewTypesModalOpen(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent bg-vo-magenta px-5 py-3 font-sans text-sm font-medium text-white shadow-sm transition-colors hover:bg-vo-magenta-hover focus:outline-none focus:ring-2 focus:ring-vo-magenta focus:ring-offset-2"
              >
                <Tags className="h-4 w-4 shrink-0" aria-hidden />
                Tipos de entrevista
              </button>
              <button
                type="button"
                onClick={() => setInterviewModalitiesModalOpen(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent bg-vo-purple px-5 py-3 font-sans text-sm font-medium text-white shadow-sm transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              >
                <Video className="h-4 w-4 shrink-0" aria-hidden />
                Modalidades de entrevista
              </button>
              <button
                type="button"
                onClick={() => setInterviewStatusesModalOpen(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent bg-vo-pink px-5 py-3 font-sans text-sm font-medium text-white shadow-sm transition-colors hover:bg-vo-pink-hover focus:outline-none focus:ring-2 focus:ring-vo-pink focus:ring-offset-2"
              >
                <ListChecks className="h-4 w-4 shrink-0" aria-hidden />
                Estados de entrevista
              </button>
            </>
          }
        />
      </section>
    </div>
  )
}
