import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import { GET } from "@/app/api/location-catalog/states/[iso2]/route"

describe("GET /api/location-catalog/states/[iso2]", () => {
  it("returns packaged departments for El Salvador", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/location-catalog/states/sv"),
      { params: Promise.resolve({ iso2: "sv" }) }
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as Array<{ iso2?: string; name?: string }>
    expect(body.some((row) => row.iso2 === "SS" && row.name === "San Salvador")).toBe(
      true
    )
  })

  it("returns packaged provinces for Afghanistan", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/location-catalog/states/AF"),
      { params: Promise.resolve({ iso2: "AF" }) }
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as Array<{ iso2?: string; name?: string }>
    expect(body.length).toBeGreaterThan(0)
    expect(body.some((row) => row.iso2 === "BDS")).toBe(true)
  })

  it("rejects an invalid country code", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/location-catalog/states/salvador"),
      { params: Promise.resolve({ iso2: "salvador" }) }
    )

    expect(response.status).toBe(400)
  })

  it("returns 404 when the packaged file is missing", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/location-catalog/states/ZZ"),
      { params: Promise.resolve({ iso2: "ZZ" }) }
    )

    expect(response.status).toBe(404)
  })
})
