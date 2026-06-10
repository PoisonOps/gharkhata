import type { ReactNode } from 'react'

interface ChipProps {
  children: ReactNode
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function Chip({ children, selected, onClick, className = '' }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
        ${selected
          ? 'bg-primary text-white'
          : 'bg-primary-tint dark:bg-primary/20 text-primary dark:text-primary-tint'
        } ${className}`}
    >
      {children}
    </button>
  )
}
