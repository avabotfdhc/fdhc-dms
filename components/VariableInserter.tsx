'use client'

interface VariableInserterProps {
  onInsert: (variable: string) => void
}

const VARIABLES = [
  '{first_name}',
  '{last_name}',
  '{rep_name}',
  '{rep_phone}',
  '{rep_email}',
  '{dealership_name}',
  '{dealership_phone}',
  '{dealership_address}',
  '{model_name}',
  '{delivery_date}',
]

export default function VariableInserter({ onInsert }: VariableInserterProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="text-xs text-slate-400 mr-1 self-center">Insert:</span>
      {VARIABLES.map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onInsert(v)}
          className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
        >
          {v}
        </button>
      ))}
    </div>
  )
}
