import { useNavigate } from 'react-router-dom'

interface FabProps {
  to?: string
  onClick?: () => void
}

export function Fab({ to, onClick }: FabProps) {
  const navigate = useNavigate()

  const handle = () => {
    if (to) navigate(to)
    else onClick?.()
  }

  return (
    <button
      onClick={handle}
      className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      aria-label="Add expense"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}
