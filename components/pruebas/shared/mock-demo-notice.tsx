export interface MockDemoNoticeProps {
  label: string
  className?: string
}

/** Discrete banner for administrative demo surfaces. */
export function MockDemoNotice({ label, className = "" }: MockDemoNoticeProps) {
  return (
    <div
      role="status"
      data-testid="mock-demo-notice"
      className={`rounded-xl border border-vo-purple/30 bg-vo-purple/10 px-3 py-2 font-sans text-sm text-emerald-900 ${className}`}
    >
      {label}
    </div>
  )
}
