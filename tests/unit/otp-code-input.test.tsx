import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import OtpCodeInput from "@/components/auth/OtpCodeInput"

function ControlledOtp({
  initialValue = "",
  onCodeChange = vi.fn(),
}: {
  initialValue?: string
  onCodeChange?: (code: string) => void
}) {
  const [code, setCode] = useState(initialValue)
  return (
    <OtpCodeInput
      label="Código de verificación"
      value={code}
      onCodeChange={(next) => {
        setCode(next)
        onCodeChange(next)
      }}
      testId="auth-register-code"
      digitAriaLabel={(current, total) => `Dígito ${current} de ${total}`}
    />
  )
}

describe("OtpCodeInput", () => {
  it("muestra un recuadro por dígito y el valor agregado", () => {
    render(<ControlledOtp />)

    expect(screen.getByTestId("auth-register-code")).toBeInTheDocument()
    expect(screen.getAllByRole("textbox")).toHaveLength(6)
    expect(screen.getByLabelText("Dígito 1 de 6")).toBeInTheDocument()
    expect(screen.getByLabelText("Dígito 6 de 6")).toBeInTheDocument()
  })

  it("avanza al siguiente recuadro al escribir un dígito", () => {
    const onCodeChange = vi.fn()
    render(<ControlledOtp onCodeChange={onCodeChange} />)

    const first = screen.getByLabelText("Dígito 1 de 6")
    const second = screen.getByLabelText("Dígito 2 de 6")
    first.focus()
    fireEvent.change(first, { target: { value: "1" } })

    expect(onCodeChange).toHaveBeenCalledWith("1")
    expect(second).toHaveFocus()
  })

  it("pega un código completo en los seis recuadros", () => {
    const onCodeChange = vi.fn()
    render(<ControlledOtp onCodeChange={onCodeChange} />)

    fireEvent.paste(screen.getByLabelText("Dígito 1 de 6"), {
      clipboardData: { getData: () => "123456" },
    })

    expect(onCodeChange).toHaveBeenCalledWith("123456")
    expect(screen.getByTestId("auth-register-code")).toHaveValue("123456")
    expect(screen.getByLabelText("Dígito 1 de 6")).toHaveValue("1")
    expect(screen.getByLabelText("Dígito 6 de 6")).toHaveValue("6")
  })

  it("completa el código desde el recuadro actual si llegan varios dígitos", () => {
    const onCodeChange = vi.fn()
    render(<ControlledOtp initialValue="12" onCodeChange={onCodeChange} />)

    fireEvent.change(screen.getByLabelText("Dígito 3 de 6"), {
      target: { value: "3456" },
    })

    expect(onCodeChange).toHaveBeenCalledWith("123456")
    expect(screen.getByLabelText("Dígito 6 de 6")).toHaveValue("6")
  })

  it("acepta el código completo desde el input agregado", () => {
    const onCodeChange = vi.fn()
    render(<ControlledOtp onCodeChange={onCodeChange} />)

    fireEvent.change(screen.getByTestId("auth-register-code"), {
      target: { value: "654321" },
    })

    expect(onCodeChange).toHaveBeenCalledWith("654321")
    expect(screen.getByLabelText("Dígito 1 de 6")).toHaveValue("6")
    expect(screen.getByLabelText("Dígito 6 de 6")).toHaveValue("1")
  })

  it("borra el dígito anterior con Backspace en un recuadro vacío", () => {
    const onCodeChange = vi.fn()
    render(<ControlledOtp initialValue="12" onCodeChange={onCodeChange} />)

    const third = screen.getByLabelText("Dígito 3 de 6")
    third.focus()
    fireEvent.keyDown(third, { key: "Backspace" })

    expect(onCodeChange).toHaveBeenCalledWith("1")
    expect(screen.getByLabelText("Dígito 2 de 6")).toHaveFocus()
  })
})
