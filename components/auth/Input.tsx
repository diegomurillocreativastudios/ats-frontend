import type { ChangeEventHandler, InputHTMLAttributes } from "react"

interface AuthInputProps
  extends Pick<
    InputHTMLAttributes<HTMLInputElement>,
    | "name"
    | "type"
    | "placeholder"
    | "required"
    | "value"
    | "onChange"
    | "disabled"
  > {
  label: string
  error?: string
  /** Para Playwright / QA: `getByTestId` */
  testId?: string
}

export default function Input({
  label,
  type = "text",
  placeholder,
  required = false,
  name,
  value,
  onChange,
  error,
  disabled = false,
  testId,
}: AuthInputProps) {
  const handleChange = onChange as ChangeEventHandler<HTMLInputElement> | undefined
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-foreground" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        data-testid={testId}
        className={`h-11 w-full rounded-md border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? "border-red-500 focus:ring-red-500" : "border-input focus:ring-vo-purple"
        }`}
      />
      {error && (
        <p id={`${name}-error`} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
