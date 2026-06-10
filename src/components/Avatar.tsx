interface AvatarProps {
  name: string
  color: string
  size?: number
  className?: string
}

export function Avatar({ name, color, size = 36, className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className={`flex items-center justify-center rounded-full font-medium text-white select-none ${className}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}
