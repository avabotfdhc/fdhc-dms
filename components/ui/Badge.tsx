interface BadgeProps {
  text: string
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'
  size?: 'sm' | 'md'
}

const variantClasses: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-600/20',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

export default function Badge({ text, variant = 'neutral', size = 'md' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {text}
    </span>
  )
}
