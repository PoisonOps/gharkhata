export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-8 h-8 border-2 border-primary-tint border-t-primary rounded-full animate-spin" />
    </div>
  )
}
