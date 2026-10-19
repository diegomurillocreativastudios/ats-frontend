import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import {
  ProfileEditJobPreferencesFields,
  sanitizeDigitsOnlySalaryInput,
} from "@/components/candidato/candidate-profile-edit-field-groups"
import type { FullProfileFormInput } from "@/lib/candidate-profile"
import esMessages from "@/messages/es.json"

const emptyForm = {
  headline: "",
  summary: "",
  resumeMarkdown: "",
  nationalId: "",
  firstName: "",
  lastName: "",
  country: "",
  birthDateInput: "",
  birthCity: "",
  maritalStatus: "",
  gender: "",
  minSalary: "",
  availability: "",
  hasDisabilityChoice: "",
  email: "",
  phoneNumber: "",
  videoLink: "",
  sectors: [],
  jobDesiredRole: "",
  jobMinSalary: "",
  jobEducationLevel: "",
  jobDesiredCity: "",
  jobAvailability: "",
  jobDisability: "",
  workRows: [],
  educationRows: [],
  languageRows: [],
  skillsText: "",
  socialRows: [],
  referenceRows: [],
  recognitionsText: "",
} as FullProfileFormInput

describe("sanitizeDigitsOnlySalaryInput", () => {
  it("deja solo dígitos", () => {
    expect(sanitizeDigitsOnlySalaryInput("12a.3-4 USD")).toBe("1234")
    expect(sanitizeDigitsOnlySalaryInput("")).toBe("")
  })
})

describe("ProfileEditJobPreferencesFields salario mínimo", () => {
  it("muestra $ y USD y solo acepta números", () => {
    let salary = ""
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <ProfileEditJobPreferencesFields
          form={{ ...emptyForm, jobMinSalary: salary }}
          patch={(partial) => {
            if (partial.jobMinSalary != null) salary = partial.jobMinSalary
          }}
          setForm={() => undefined}
          saving={false}
        />
      </NextIntlClientProvider>,
    )

    expect(screen.getByText("$")).toBeInTheDocument()
    expect(screen.getByText("USD")).toBeInTheDocument()

    const input = screen.getByLabelText(/Salario mínimo/i)
    fireEvent.change(input, { target: { value: "25a0" } })
    expect(salary).toBe("250")

    const blocked = fireEvent.keyDown(input, { key: "e" })
    const digit = fireEvent.keyDown(input, { key: "5" })
    expect(blocked).toBe(false)
    expect(digit).toBe(true)
  })
})
