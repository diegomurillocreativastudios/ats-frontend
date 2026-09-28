import type {
  ChangeEventHandler,
  InputHTMLAttributes,
  ReactNode,
} from "react"

interface AuthInputProps
  extends Pick<
    InputHTMLAttributes<HTMLInputElement>,
    | "name"
    | "type"
    | "placeholder"
    | "autoComplete"
    | "required"
    | "value"
    | "onChange"
    | "disabled"
    | "maxLength"
    | "minLength"
    | "inputMode"
    | "pattern"
    | "autoFocus"
    | "spellCheck"
  > {
  label: string
  error?: string
  /** Para Playwright / QA: `getByTestId` */
  testId?: string
  /** Acento del foco (p. ej. pantalla con marca `vo-navy`) */
  accent?: "purple" | "navy" | "green"
  leftIcon?: ReactNode
  rightAction?: ReactNode
  labelTrailing?: ReactNode
  labelClassName?: string
}

const accentClassName: Record<
  NonNullable<AuthInputProps["accent"]>,
  string
> = {
  purple: "border-input focus:ring-vo-purple",
  navy: "border-input focus:ring-vo-navy",
  green: "border-input bg-white focus:border-vo-purple focus:ring-vo-purple",
}

export default function Input({
  label,
  type = "text",
  placeholder,
  autoComplete,
  required = false,
  name,
  value,
  onChange,
  error,
  disabled = false,
  maxLength,
  minLength,
  inputMode,
  pattern,
  autoFocus,
  spellCheck,
  testId,
  accent = "purple",
  leftIcon,
  rightAction,
  labelTrailing,
  labelClassName,
}: AuthInputProps) {
  const handleChange = onChange as ChangeEventHandler<HTMLInputElement> | undefined
  const paddingClassName = [
    leftIcon ? "pl-10" : "pl-4",
    rightAction ? "pr-11" : "pr-4",
  ].join(" ")

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          className={
            labelClassName ?? "text-sm font-medium text-foreground"
          }
          htmlFor={name}
        >
          {label}
        </label>
        {labelTrailing}
      </div>
      <div className="relative">
        {leftIcon ? (
          <span
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"
            aria-hidden
          >
            {leftIcon}
          </span>
        ) : null}
        <input
          id={name}
          type={type}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          maxLength={maxLength}
          minLength={minLength}
          inputMode={inputMode}
          pattern={pattern}
          autoFocus={autoFocus}
          spellCheck={spellCheck}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          data-testid={testId}
          className={`h-11 w-full rounded-lg border py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${paddingClassName} ${
            error
              ? "border-red-500 focus:ring-red-500"
              : accentClassName[accent]
          }`}
        />
        {rightAction ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
            {rightAction}
          </div>
        ) : null}
      </div>
      {error ? (
        <p id={`${name}-error`} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
