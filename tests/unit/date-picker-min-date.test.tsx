import { describe, it, expect, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import { DatePicker } from "@/components/ui/date-picker"
import { getTodayDateInputValue } from "@/lib/interview-datetime"
import { renderWithIntl } from "@/tests/helpers/render-with-intl"

function shiftYmd(ymd: string, dayDelta: number): string {
  const [y, m, d] = ymd.split("-").map((x) => Number.parseInt(x, 10))
  const date = new Date(y, m - 1, d + dayDelta)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

describe("DatePicker minDate", () => {
  it("does not call onChange when picking a day before minDate", () => {
    const onChange = vi.fn()
    const today = getTodayDateInputValue()
    const todayDay = Number.parseInt(today.slice(8, 10), 10)

    renderWithIntl(
      <DatePicker value="" onChange={onChange} minDate={today} ariaLabel="Fecha" />
    )

    fireEvent.click(screen.getByRole("button", { name: "Fecha" }))

    if (todayDay > 1) {
      const pastDayBtn = screen.getByRole("button", {
        name: `Día ${todayDay - 1}`,
      })
      expect(pastDayBtn).toBeDisabled()
      fireEvent.click(pastDayBtn)
      expect(onChange).not.toHaveBeenCalled()
    } else {
      expect(
        screen.getByRole("button", { name: "Mes anterior" })
      ).toBeDisabled()
    }
  })

  it("calls onChange when picking today with minDate set to today", () => {
    const onChange = vi.fn()
    const today = getTodayDateInputValue()
    const todayDay = Number.parseInt(today.slice(8, 10), 10)

    renderWithIntl(
      <DatePicker value="" onChange={onChange} minDate={today} ariaLabel="Fecha" />
    )

    fireEvent.click(screen.getByRole("button", { name: "Fecha" }))
    fireEvent.click(screen.getByRole("button", { name: `Día ${todayDay}` }))
    expect(onChange).toHaveBeenCalledWith(today)
  })

  it("allows picking a past day when minDate is not set", () => {
    const onChange = vi.fn()
    const today = getTodayDateInputValue()
    const yesterday = shiftYmd(today, -1)
    const yesterdayDay = Number.parseInt(yesterday.slice(8, 10), 10)

    renderWithIntl(
      <DatePicker value="" onChange={onChange} ariaLabel="Fecha" />
    )

    fireEvent.click(screen.getByRole("button", { name: "Fecha" }))

    if (today.slice(0, 7) !== yesterday.slice(0, 7)) {
      fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }))
    }

    const yesterdayBtn = screen.getByRole("button", {
      name: `Día ${yesterdayDay}`,
    })
    expect(yesterdayBtn).not.toBeDisabled()
    fireEvent.click(yesterdayBtn)
    expect(onChange).toHaveBeenCalledWith(yesterday)
  })
})
