import { describe, expect, it } from "vitest"
import { pageNumberForNamedItem } from "@/lib/templates/template-list-page"

describe("pageNumberForNamedItem", () => {
  const names = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"]

  it("returns the 1-based page for a name past the first page of 10", () => {
    expect(pageNumberForNamedItem(names, "k", 10)).toBe(2)
  })

  it("returns page 1 when the name is in the first page", () => {
    expect(pageNumberForNamedItem(names, "a", 10)).toBe(1)
  })

  it("returns null when the name is not in the list", () => {
    expect(pageNumberForNamedItem(names, "missing", 10)).toBeNull()
  })
})
