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
}: PortalPageHeaderProps) {
  return (
    <header
      className={joinClasses(
        "flex flex-col gap-5 border-b border-border pb-6",
        className
      )}
    >
      <div className={joinClasses("min-w-0", contentClassName)}>
        <h1
          id={id}
          className={joinClasses(
            "font-inter text-xl font-bold leading-tight tracking-tight text-foreground",
            titleClassName
          )}
        >
          {title}
        </h1>
        {description ? (
          <div
            className={joinClasses(
              "mt-1.5 max-w-4xl font-inter text-base leading-7 text-muted-foreground",
              descriptionClassName
            )}
          >
            {description}
          </div>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-3">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
