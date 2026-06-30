"use client"

import { EmptyValue } from "@/components/candidato/profile-tailoring/comparison/EmptyValue"

interface FieldGridItem {
  label: string
  value: unknown
  emphasize?: boolean
}

interface FieldGridProps {
  items: FieldGridItem[]
  emptyLabel: string
}

const isEmpty = (value: unknown) => value == null || String(value).trim() === ""

export function FieldGrid({ items, emptyLabel }: FieldGridProps) {
  return (
    <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
      {items.map(({ label, value, emphasize }) => {
        const empty = isEmpty(value)
        return (
          <div
            key={label}
            className="flex flex-col gap-1.5 rounded-lg border border-transparent px-0.5 py-0.5"
          >
            <dt className="font-sans text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              {label}
            </dt>
            <dd
              className={`font-sans leading-relaxed ${
                emphasize
                  ? "text-base font-semibold tracking-tight text-foreground"
                  : "text-sm font-medium text-foreground/95"
              }`}
            >
              {empty ? <EmptyValue message={emptyLabel} compact /> : String(value).trim()}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

interface EditorialFieldProps {
  label: string
  value: unknown
  emptyLabel: string
  variant: "original" | "adapted"
  emphasize?: boolean
}

export function EditorialField({
  label,
  value,
  emptyLabel,
  variant,
  emphasize = false,
}: EditorialFieldProps) {
  const empty = isEmpty(value)
  return (
    <div className="flex flex-col gap-2">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </p>
      {empty ? (
        <EmptyValue message={emptyLabel} />
      ) : (
        <p
          className={`max-w-prose whitespace-pre-wrap font-sans leading-[1.65] ${
            emphasize && variant === "adapted"
              ? "text-lg font-semibold tracking-tight text-foreground"
              : emphasize
                ? "text-base font-semibold tracking-tight text-foreground"
                : "text-sm text-foreground/90"
          }`}
        >
          {String(value).trim()}
        </p>
      )}
    </div>
  )
}
