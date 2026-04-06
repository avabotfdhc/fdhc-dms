'use client'

interface SequenceStep {
  id: string
  step_order: number
  channel: string
  delay_amount: number | null
  delay_unit: string | null
  template_id: string | null
  template_name?: string | null
  template_body_preview?: string | null
  condition_field: string | null
  condition_operator: string | null
  condition_value: string | null
}

interface SequenceStepCardProps {
  step: SequenceStep
  onEdit: (step: SequenceStep) => void
  onDelete: (stepId: string) => void
}

const channelConfig: Record<string, { icon: string; borderColor: string; label: string }> = {
  phone: { icon: '\uD83D\uDCDE', borderColor: 'border-l-emerald-500', label: 'Phone' },
  email: { icon: '\uD83D\uDCE7', borderColor: 'border-l-blue-500', label: 'Email' },
  sms: { icon: '\uD83D\uDCAC', borderColor: 'border-l-purple-500', label: 'SMS' },
}

function formatDelay(amount: number | null, unit: string | null): string {
  if (!amount || !unit) return 'Immediately'
  const plural = amount === 1 ? '' : 's'
  return `After ${amount} ${unit}${plural}`
}

export default function SequenceStepCard({ step, onEdit, onDelete }: SequenceStepCardProps) {
  const config = channelConfig[step.channel] || channelConfig.phone
  const hasCondition = step.condition_field && step.condition_operator && step.condition_value

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-slate-100 border-l-4 ${config.borderColor} p-3`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-400">#{step.step_order}</span>
            <span className="text-base">{config.icon}</span>
            <span className="text-xs font-medium text-slate-600">{config.label}</span>
            <span className="text-xs text-slate-400">{formatDelay(step.delay_amount, step.delay_unit)}</span>
          </div>

          {step.template_name && (
            <p className="text-sm text-slate-700 truncate">
              {step.template_name}
            </p>
          )}

          {step.template_body_preview && (
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {step.template_body_preview.slice(0, 50)}
              {step.template_body_preview.length > 50 ? '...' : ''}
            </p>
          )}

          {hasCondition && (
            <div className="mt-1.5 px-2 py-1 bg-amber-50 rounded text-xs text-amber-700 inline-block">
              If {step.condition_field} {step.condition_operator} {step.condition_value}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(step)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Edit step"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(step.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            aria-label="Delete step"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
