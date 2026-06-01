import { describe, expect, it } from "vitest"
import { resolveReportViewMainElement } from "@/lib/pdf/download-report-view-as-pdf"

describe("resolveReportViewMainElement", () => {
  it("returns null when reports shell is missing", () => {
    document.body.innerHTML = "<div></div>"
    expect(resolveReportViewMainElement()).toBeNull()
  })

  it("returns the visible main inside the reports shell", () => {
    document.body.innerHTML = `
      <div data-rrhh-reports-shell>
        <div class="hidden lg:flex">
          <main style="width:100px;height:100px">desktop</main>
        </div>
        <div class="lg:hidden">
          <main style="width:0;height:0">mobile hidden</main>
        </div>
      </div>
    `

    const el = resolveReportViewMainElement()
    expect(el?.textContent).toBe("desktop")
  })
})
