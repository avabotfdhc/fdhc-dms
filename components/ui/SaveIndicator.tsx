'use client'

interface SaveIndicatorProps {
  status: 'saved' | 'saving' | 'unsaved' | 'error'
}

const config: Record<string, { label: string; classes: string; dot: string }> = {
  saved: {
    label: 'Saved',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  saving: {
    label: 'Saving...',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500 animate-pulse',
  },
  unsaved: {
    label: 'Unsaved',
    classes: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  error: {
    label: 'Error',
    classes: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
}

export default function SaveIndicator({ status }: SaveIndicatorProps) {
  const { label, classes, dot } = config[status]

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity duration-300 ${classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </div>
  )
}
