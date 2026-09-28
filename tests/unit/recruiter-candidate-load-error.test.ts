import { describe, expect, it } from "vitest"
import { mapRecruiterCandidateLoadError } from "@/hooks/use-recruiter-candidate-profile"

const t = (key: string) => key

describe("mapRecruiterCandidateLoadError", () => {
  it("trata un 400 de GUID inválido como enlace no válido y no reintenta", () => {
    const err = Object.assign(new Error('{"title":"One or more validation errors occurred."}'), {
      status: 400,
    })
    expect(mapRecruiterCandidateLoadError(err, t)).toEqual({
      message: "errors.invalidCandidateId",
      canRetry: false,
    })
  })

  it("trata 404 como candidato no disponible", () => {
    const err = Object.assign(new Error("Not Found"), { status: 404 })
    expect(mapRecruiterCandidateLoadError(err, t)).toEqual({
      message: "errors.candidateUnavailable",
      canRetry: false,
    })
  })

  it("permite reintentar un error de servidor", () => {
    const err = Object.assign(new Error("El servicio no responde"), { status: 500 })
    expect(mapRecruiterCandidateLoadError(err, t)).toEqual({
      message: "El servicio no responde",
      canRetry: true,
    })
  })
})
