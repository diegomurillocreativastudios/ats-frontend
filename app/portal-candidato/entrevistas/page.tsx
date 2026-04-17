import CandidateInterviewsContent from "@/components/candidato/CandidateInterviewsContent"

export const metadata = {
  title: { absolute: "ATS | Portal Candidato - Entrevistas" },
  description:
    "Consultá tus entrevistas agendadas e historial en el portal del candidato",
}

export default function PortalCandidatoEntrevistasPage() {
  return <CandidateInterviewsContent />
}
