interface EmptyStateProps {
  icon?: string
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon = '📭', title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {subtitle && <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-5 py-2 bg-primary text-white rounded-control text-sm font-medium active:scale-95 transition-transform"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
