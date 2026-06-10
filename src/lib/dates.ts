/** Days remaining in current month including today */
export function daysLeftInMonth(date: Date = new Date()): number {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return lastDay - date.getDate() + 1
}

/** First and last day of a given month as YYYY-MM-DD strings */
export function monthBounds(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

/** Today's YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().split('T')[0]
}

/** Compute next due date for a cycle-based recurring item */
export function nextCycleDate(lastPaidOn: string | null, cycleDays: number): Date {
  const base = lastPaidOn ? new Date(lastPaidOn) : new Date()
  const next = new Date(base)
  next.setDate(next.getDate() + cycleDays)
  return next
}

/** Next occurrence of a fixed monthly date */
export function nextFixedDate(dueDay: number, from: Date = new Date()): Date {
  const attempt = new Date(from.getFullYear(), from.getMonth(), dueDay)
  if (attempt <= from) {
    attempt.setMonth(attempt.getMonth() + 1)
  }
  return attempt
}

/** Is a date within the next N days? */
export function isDueSoon(dateStr: string, withinDays = 7): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diff >= -1 && diff <= withinDays
}

/** Format a Date as YYYY-MM-DD */
export function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}
