"use client"

import {
  useId,
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react"

const DEFAULT_OTP_LENGTH = 6

interface OtpCodeInputProps {
  label: string
  value: string
  onCodeChange: (code: string) => void
  name?: string
  error?: string
  disabled?: boolean
  length?: number
  testId?: string
  digitAriaLabel: (current: number, total: number) => string
}

function splitDigits(value: string, length: number): string[] {
  const digits = value.replace(/\D/g, "").slice(0, length).split("")
  return Array.from({ length }, (_, index) => digits[index] ?? "")
}

function replaceDigit(digits: string[], index: number, digit: string): string {
  return digits.map((current, i) => (i === index ? digit : current)).join("")
}

export default function OtpCodeInput({
  label,
  value,
  onCodeChange,
  name = "code",
  error,
  disabled = false,
  length = DEFAULT_OTP_LENGTH,
  testId,
  digitAriaLabel,
}: OtpCodeInputProps) {
  const fieldId = useId()
  const labelId = `${fieldId}-label`
  const errorId = `${fieldId}-error`
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const digits = splitDigits(value, length)

  const emitCode = (nextCode: string) => {
    onCodeChange(nextCode.replace(/\D/g, "").slice(0, length))
  }

  const focusDigit = (index: number) => {
    const next = Math.max(0, Math.min(index, length - 1))
    inputRefs.current[next]?.focus()
  }

  const handleHiddenChange = (event: ChangeEvent<HTMLInputElement>) => {
    emitCode(event.target.value)
  }

  const handleDigitChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "")
    if (!cleaned) {
      emitCode(replaceDigit(digits, index, ""))
      return
    }

    if (cleaned.length > 1) {
      if (cleaned.length >= length) {
        emitCode(cleaned)
        focusDigit(length - 1)
        return
      }
      const merged = [...digits]
      cleaned.split("").forEach((nextDigit, offset) => {
        if (index + offset < length) merged[index + offset] = nextDigit
      })
      emitCode(merged.join(""))
      focusDigit(Math.min(index + cleaned.length, length) - 1)
      return
    }

    emitCode(replaceDigit(digits, index, cleaned))
    if (index < length - 1) focusDigit(index + 1)
  }

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace") {
      event.preventDefault()
      if (digits[index]) {
        emitCode(replaceDigit(digits, index, ""))
        return
      }
      if (index > 0) {
        emitCode(replaceDigit(digits, index - 1, ""))
        focusDigit(index - 1)
      }
      return
    }

    if (event.key === "Delete") {
      event.preventDefault()
      emitCode(replaceDigit(digits, index, ""))
      return
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault()
      focusDigit(index - 1)
      return
    }

    if (event.key === "ArrowRight") {
      event.preventDefault()
      focusDigit(index + 1)
      return
    }

    if (event.key === "Home") {
      event.preventDefault()
      focusDigit(0)
      return
    }

    if (event.key === "End") {
      event.preventDefault()
      focusDigit(length - 1)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "")
    if (!pasted) return
    event.preventDefault()
    emitCode(pasted)
    focusDigit(Math.min(pasted.length, length) - 1)
  }

  const boxClassName = [
    "glass-input h-16 w-10 shrink-0 rounded-[1.15rem] sm:h-[4.25rem] sm:w-12 sm:rounded-[1.25rem]",
    "text-center text-xl font-semibold tabular-nums text-foreground",
    "caret-[var(--color-green-primary)] selection:bg-vo-purple/20",
    "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
    error
      ? "border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(220,38,38,0.18)]"
      : "",
  ].join(" ")

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label
        id={labelId}
        htmlFor={`${fieldId}-0`}
        className="text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleHiddenChange}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        data-testid={testId}
        className="sr-only"
      />
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        className="flex w-full justify-center gap-2 sm:gap-2.5"
      >
        {digits.map((digit, index) => (
          <input
            key={`${fieldId}-${index}`}
            id={`${fieldId}-${index}`}
            ref={(node) => {
              inputRefs.current[index] = node
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={length}
            value={digit}
            disabled={disabled}
            aria-label={digitAriaLabel(index + 1, length)}
            aria-invalid={!!error}
            data-testid={testId ? `${testId}-digit-${index}` : undefined}
            onChange={(event) => handleDigitChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.target.select()}
            className={boxClassName}
          />
        ))}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
