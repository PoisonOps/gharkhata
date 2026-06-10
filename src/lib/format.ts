/** Format a number as Indian currency: ₹1,24,000 */
export function formatCurrency(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN')
}

/** Format a decimal currency with paise: ₹1,240.50 */
export function formatCurrencyFull(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Format a date as "12 Jan" */
export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Format a date as "12 Jan 2024" */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Format as YYYY-MM-DD for inputs */
export function toInputDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

/** Month name: "January 2024" */
export function formatMonth(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}
