import { splitDelimitedFacts } from "@/lib/vacancies/split-delimited-facts"

interface VacancyDelimitedTextProps {
  value: unknown
  variant: "chips" | "list"
}

function toPlainText(value: unknown): string {
  if (value == null) return ""
  return String(value).trim()
}

/**
 * Renders vacancy details or benefits as chips or a list when the text is delimited.
 */
export function VacancyDelimitedText({ value, variant }: VacancyDelimitedTextProps) {
  const text = toPlainText(value)
  if (text === "") return null

  const items = splitDelimitedFacts(text)
  if (items.length <= 1) {
    return (
      <p className="font-sans text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {text}
      </p>
    )
  }

  if (variant === "chips") {
    return (
      <ul className="flex flex-wrap gap-2" role="list">
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="inline-flex max-w-full items-center rounded-md bg-muted px-2.5 py-1 font-sans text-sm text-foreground"
          >
            {item}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="flex flex-col gap-2" role="list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2.5">
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-vo-purple"
            aria-hidden
          />
          <span className="font-sans text-sm leading-relaxed text-muted-foreground">
            {item}
          </span>
        </li>
      ))}
    </ul>
  )
}
