const BAR_WIDTH_TRANSITION_MS = 320
const BAR_WIDTH_SUCCESS_MS = 700

/** Tema clásico (solid) / oscuro (gradiente) / mismo gradiente sobre fondos claros (RRHH) */
const APPLY_GRADIENT_BAR_FILL =
  "relative h-2.5 rounded-full bg-[linear-gradient(90deg,#A45C40_0%,#B87333_100%)] shadow-[0_0_24px_rgba(164,92,64,0.35)]"

export type ApplyStyleProgressTheme = "light" | "dark" | "onLight"

export interface ApplyStyleProgressBarProps {
  theme?: ApplyStyleProgressTheme
  mode?: "loading" | "success"
  /** 0–100 en carga; en éxito se ignora el valor numérico y se muestra 100% */
  percent: number
  className?: string
}

/**
 * Barra alineada con `/portal-oportunidades/.../aplicar`: tema `light` = `bg-ats-terracotta` sobre `bg-muted`;
 * `dark` y `onLight` = gradiente terracota-cobre (#A45C40 → #B87333) y resplandor, como el overlay oscuro del formulario.
 */
export function ApplyStyleProgressBar({
  theme = "light",
  mode = "loading",
  percent,
  className = "",
}: ApplyStyleProgressBarProps) {
  const isGradientTheme = theme === "dark" || theme === "onLight"
  const isSuccess = mode === "success"
  const pct = isSuccess ? 100 : Math.max(2, percent)

  const trackClass =
    theme === "dark"
      ? "bg-muted/50"
      : theme === "onLight"
        ? "bg-ats-grafito/10"
        : "bg-muted"

  return (
    <div
      className={`relative overflow-hidden rounded-full ${trackClass} ${className}`.trim()}
      aria-hidden
    >
      <div
        className={
          isGradientTheme
            ? APPLY_GRADIENT_BAR_FILL
            : "relative h-2.5 rounded-full bg-ats-terracotta"
        }
        style={{
          width: `${pct}%`,
          transition: `width ${
            isSuccess ? BAR_WIDTH_SUCCESS_MS : BAR_WIDTH_TRANSITION_MS
          }ms cubic-bezier(0.33, 0.86, 0.2, 1)`,
        }}
      >
        {!isSuccess ? (
          <span
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.38),transparent)] animate-apply-shimmer"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  )
}
