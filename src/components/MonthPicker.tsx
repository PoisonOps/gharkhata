import { formatMonth } from '../lib/format'

interface MonthPickerProps {
  year: number
  month: number
  onChange: (year: number, month: number) => void
}

export function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const prev = () => {
    if (month === 1) onChange(year - 1, 12)
    else onChange(year, month - 1)
  }
  const next = () => {
    const now = new Date()
    if (year >= now.getFullYear() && month >= now.getMonth() + 1) return
    if (month === 12) onChange(year + 1, 1)
    else onChange(year, month + 1)
  }

  const isCurrentMonth = () => {
    const now = new Date()
    return year === now.getFullYear() && month === now.getMonth() + 1
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={prev}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Previous month"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span className="text-sm font-medium min-w-[110px] text-center">
        {formatMonth(year, month)}
      </span>
      <button
        onClick={next}
        disabled={isCurrentMonth()}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30"
        aria-label="Next month"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}
