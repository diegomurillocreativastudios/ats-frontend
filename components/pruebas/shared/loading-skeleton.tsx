export interface LoadingSkeletonProps {
  variant?: "card" | "list"
  rows?: number
  className?: string
}

export function LoadingSkeleton({
  variant = "list",
  rows = 3,
  className = "",
}: LoadingSkeletonProps) {
  const count = Math.max(1, rows)

  if (variant === "card") {
    return (
      <div
        data-testid="loading-skeleton"
        data-variant="card"
        aria-busy="true"
        aria-live="polite"
        className={`grid gap-4 sm:grid-cols-2 ${className}`}
      >
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="glass-card h-36 animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      data-testid="loading-skeleton"
      data-variant="list"
      aria-busy="true"
      aria-live="polite"
      className={`flex flex-col gap-3 ${className}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="h-12 animate-pulse rounded-xl bg-muted"
        />
      ))}
    </div>
  )
}
