import { describe, expect, it } from "vitest"
import { extractStructuredApiErrorMessage, getApiErrorMessage } from "@/lib/api-error"

const problemDetailsJson = JSON.stringify({
  type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: {
    id: ["The value 'id-invalido-00000-test' is not valid."],
  },
  traceId: "00-8bb3f077a8eb425ae61535c6d9060ea3-e7eaef95dc32df96-00",
})

describe("getApiErrorMessage", () => {
  it("no devuelve el JSON crudo de Problem Details", () => {
    const message = getApiErrorMessage(problemDetailsJson)
    expect(message).not.toContain("traceId")
    expect(message).not.toContain("rfc9110")
    expect(message.startsWith("{")).toBe(false)
  })

  it("lee el cuerpo adjunto de un Error de apiClient", () => {
    const err = new Error(problemDetailsJson) as Error & { body?: unknown }
    err.body = JSON.parse(problemDetailsJson)
    const message = getApiErrorMessage(err)
    expect(message).toBe("The value 'id-invalido-00000-test' is not valid.")
    expect(message).not.toContain("traceId")
  })

  it("sigue combinando message y detail", () => {
    expect(
      getApiErrorMessage({ message: "Guardado fallido", detail: "Email inválido" })
    ).toBe("Guardado fallido — Email inválido")
  })

  it("usa el fallback si solo hay un título genérico de ASP.NET", () => {
    expect(
      getApiErrorMessage({
        title: "One or more validation errors occurred.",
        status: 400,
      })
    ).toBe("Error desconocido")
  })
})

describe("extractStructuredApiErrorMessage", () => {
  it("devuelve vacío ante JSON técnico sin mensaje útil", () => {
    expect(
      extractStructuredApiErrorMessage({
        type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
        title: "Bad Request",
        status: 400,
        traceId: "00-abc-00",
      })
    ).toBe("")
  })
})
