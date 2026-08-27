import type { ReactNode } from "react"

interface PortalPageHeaderProps {
  id?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
  contentClassName?: string
  titleClassName?: string
  descriptionClassName?: string
  layout?: "stacked" | "split"
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export default function PortalPageHeader({
  id,
  title,
  description,
  actions,
  className,
  contentClassName,
  titleClassName,
  descriptionClassName,
  layout = "stacked",
}: PortalPageHeaderProps) {
  const isSplit = layout === "split"

  return (
    <header
      className={joinClasses(
        "border-b border-border pb-6",
        isSplit
          ? "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
          : "flex flex-col gap-5",
        className
      )}
    >
      <div className={joinClasses("min-w-0 flex-1", contentClassName)}>
        <h1
          id={id}
          className={joinClasses(
            "font-sans text-xl font-bold leading-tight tracking-tight text-foreground",
            titleClassName
          )}
        >
          {title}
        </h1>
        {description ? (
          <div
            className={joinClasses(
              "mt-1.5 max-w-4xl font-sans text-base leading-7 text-muted-foreground",
              descriptionClassName
            )}
          >
            {description}
          </div>
        ) : null}
      </div>

      {actions ? (
        <div
          className={joinClasses(
            "flex flex-wrap items-center gap-3",
            isSplit && "shrink-0 sm:pt-0.5"
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  )
}
