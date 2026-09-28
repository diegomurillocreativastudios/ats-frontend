import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  mapRecruiterAccount,
  updateRecruiterAccount,
} from "@/lib/api/recruiter-account"

vi.mock("@/lib/auth/csrf-client", () => ({
  csrfHeaders: vi.fn(async (extra?: Record<string, string>) => ({
    ...(extra ?? {}),
    "x-csrf-token": "test-csrf",
  })),
}))

function jsonResponse(
  status: number,
  body: unknown,
  headers?: Record<string, string>
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => {
        const key = name.toLowerCase()
        if (key === "content-type") return "application/json"
        if (headers && key in headers) return headers[key]
        if (key === "retry-after") return headers?.["retry-after"] ?? null
        return null
      },
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

describe("mapRecruiterAccount", () => {
  it("lee name, email y role desde el objeto plano", () => {
    expect(
      mapRecruiterAccount({
        id: "u-1",
        name: "Ana",
        email: "ana@example.com",
        role: "recruiter",
      })
    ).toEqual({
      id: "u-1",
      name: "Ana",
      email: "ana@example.com",
      role: "recruiter",
      hasPhoto: false,
    })
  })

  it("usa userName y user anidado cuando name no viene", () => {
    expect(
      mapRecruiterAccount({
        user: {
          id: 9,
          userName: "Diego",
          email: "diego@example.com",
          roles: ["Admin"],
        },
      })
    ).toEqual({
      id: "9",
      name: "Diego",
      email: "diego@example.com",
      role: "Admin",
      hasPhoto: false,
    })
  })

  it("no muestra el correo como nombre visible", () => {
    expect(
      mapRecruiterAccount({
        email: "diego@example.com",
        userName: "diego@example.com",
      })
    ).toEqual({
      id: null,
      name: "diego",
      email: "diego@example.com",
      role: null,
      hasPhoto: false,
    })
  })

  it("cae al fallback si el cuerpo viene vacío", () => {
    expect(mapRecruiterAccount({}, "Nombre nuevo")).toEqual({
      id: null,
      name: "Nombre nuevo",
      email: "",
      role: null,
      hasPhoto: false,
    })
  })

  it("lee hasPhoto de la sesión", () => {
    expect(
      mapRecruiterAccount({
        id: "u-1",
        name: "Ana",
        email: "ana@example.com",
        role: "recruiter",
        hasPhoto: true,
      }).hasPhoto
    ).toBe(true)
  })
})

describe("updateRecruiterAccount", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    globalThis.fetch = originalFetch
  })

  it("envía userName y name recortados a PATCH /api/auth/profile", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, {
        id: "u-1",
        name: "Diego Murillo",
        userName: "Diego Murillo",
        email: "diego@example.com",
        role: "recruiter",
      })
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await updateRecruiterAccount({
      userName: "  Diego Murillo  ",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/profile",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          userName: "Diego Murillo",
          name: "Diego Murillo",
        }),
      })
    )
    expect(result.name).toBe("Diego Murillo")
  })

  it("expone retryAfter en 429 sin reintentar", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(
        429,
        { message: "Demasiados intentos. Probá de nuevo más tarde." },
        { "retry-after": "20" }
      )
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await expect(
      updateRecruiterAccount({ userName: "Diego Murillo" })
    ).rejects.toMatchObject({
      status: 429,
      retryAfter: 20,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("manda a login si el refresh no recupera la sesión", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: "No autorizado" }))
      .mockResolvedValueOnce(jsonResponse(401, { message: "No autorizado" }))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const hrefSetter = vi.fn()
    vi.stubGlobal(
      "window",
      Object.assign(globalThis.window ?? {}, {
        location: { href: "", origin: "http://localhost:3000" },
      })
    )
    Object.defineProperty(window.location, "href", {
      configurable: true,
      set: hrefSetter,
      get: () => "",
    })

    await expect(
      updateRecruiterAccount({ userName: "Diego Murillo" })
    ).rejects.toMatchObject({ status: 401 })

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST" })
    )
    expect(hrefSetter).toHaveBeenCalledWith("/auth/iniciar-sesion")
    vi.unstubAllGlobals()
  })
})
