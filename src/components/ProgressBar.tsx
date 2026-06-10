interface ProgressBarProps {
  pct: number // 0-100+
  height?: number
  className?: string
}

export function ProgressBar({ pct, height = 6, className = '' }: ProgressBarProps) {
  const capped = Math.min(pct, 100)
  const color =
    pct > 100 ? 'bg-over' : pct >= 80 ? 'bg-warn' : 'bg-good'

  return (
    <div
      className={`w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden ${className}`}
      style={{ height }}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${capped}%` }}
      />
    </div>
  )
}
