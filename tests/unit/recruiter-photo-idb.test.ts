import { describe, expect, it } from "vitest"
import { dataUriToBlob } from "@/lib/rrhh/recruiter-photo-idb"

describe("recruiter-photo-idb helpers", () => {
  it("converts a raster data URI into a Blob", async () => {
    const blob = dataUriToBlob("data:image/png;base64,AQID")
    expect(blob).not.toBeNull()
    expect(blob?.type).toBe("image/png")
    expect(blob?.size).toBe(3)
    const bytes = new Uint8Array(await blob!.arrayBuffer())
    expect(Array.from(bytes)).toEqual([1, 2, 3])
  })

  it("returns null for invalid data URIs", () => {
    expect(dataUriToBlob("")).toBeNull()
    expect(dataUriToBlob("https://example.com/a.png")).toBeNull()
    expect(dataUriToBlob("data:image/png;base64,@@@")).toBeNull()
  })
})
