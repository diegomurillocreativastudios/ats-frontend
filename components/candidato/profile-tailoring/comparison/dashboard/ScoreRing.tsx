"use client"

interface ScoreRingProps {
  score: number
  label: string
  variant: "current" | "adapted"
  size?: number
}

const VARIANT_COLORS = {
  current: {
    stroke: "stroke-indigo-500",
    track: "stroke-indigo-500/15",
    text: "text-indigo-600 dark:text-indigo-300",
    glow: "from-indigo-500/10 to-transparent",
  },
  adapted: {
    stroke: "stroke-emerald-500",
    track: "stroke-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-300",
    glow: "from-emerald-500/10 to-transparent",
  },
} as const

export function ScoreRing({ score, label, variant, size = 96 }: ScoreRingProps) {
  const colors = VARIANT_COLORS[variant]
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, score))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div
        className={`relative flex items-center justify-center rounded-full bg-linear-to-b ${colors.glow}`}
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`${label}: ${clamped}%`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={colors.track}
            strokeWidth={8}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={`${colors.stroke} motion-safe:transition-all motion-safe:duration-700`}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display text-xl font-bold ${colors.text}`}>{clamped}%</span>
        </div>
      </div>
      <p className="max-w-[8rem] text-center font-sans text-[11px] font-medium leading-snug text-muted-foreground">
        {label}
      </p>
    </div>
  )
}
