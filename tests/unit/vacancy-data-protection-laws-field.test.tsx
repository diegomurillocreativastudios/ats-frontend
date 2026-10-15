import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { VacancyDataProtectionLawsField } from "@/components/rrhh/VacancyDataProtectionLawsField"
import type { VacancyDataProtectionLaw } from "@/lib/vacancies/vacancy-data-protection-laws"

const laws: VacancyDataProtectionLaw[] = [
  {
    id: "sv",
    code: "ley-proteccion-datos-el-salvador",
    displayName: "Ley de El Salvador",
    jurisdictionCode: "SV",
    officialReference: "",
    summary: "",
    locale: "es",
    body: "",
    isActive: true,
  },
  {
    id: "old",
    code: "archived",
    displayName: "Ley archivada",
    jurisdictionCode: "EU",
    officialReference: "",
    summary: "",
    locale: "es",
    body: "",
    isActive: false,
  },
]

const labels = {
  legend: "Leyes de protección de datos",
  helper: "Elige al menos una.",
  placeholder: "Selecciona una o más leyes",
  emptyLabel: "No hay leyes activas.",
  inactiveLabel: "Inactiva",
  loadingLabel: "Cargando leyes…",
  loadErrorLabel: "No se pudieron cargar las leyes.",
}

describe("VacancyDataProtectionLawsField", () => {
  it("toggles an active law and keeps a selected inactive law visible", () => {
    const onChange = vi.fn()
    render(
      <VacancyDataProtectionLawsField
        {...labels}
        laws={laws}
        selectedIds={["old"]}
        onChange={onChange}
        errorId="laws-error"
      />,
    )

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Leyes de protección de datos/ }))

    expect(screen.getByRole("checkbox", { name: /Ley archivada/ })).toBeChecked()
    fireEvent.click(screen.getByRole("checkbox", { name: /Ley de El Salvador/ }))
    expect(onChange).toHaveBeenCalledWith(["old", "sv"])
  })

  it("shows the validation message", () => {
    render(
      <VacancyDataProtectionLawsField
        {...labels}
        laws={laws.filter((law) => law.isActive)}
        selectedIds={[]}
        onChange={() => {}}
        error="Selecciona al menos una ley de protección de datos."
        errorId="laws-error"
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Selecciona al menos una ley de protección de datos.",
    )
  })
})
