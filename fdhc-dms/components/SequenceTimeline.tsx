'use client'

import SequenceStepCard from './SequenceStepCard'

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

interface SequenceTimelineProps {
  steps: SequenceStep[]
  onStepEdit: (step: SequenceStep) => void
  onStepDelete: (stepId: string) => void
  onStepAdd: () => void
}

const channelDotColor: Record<string, string> = {
  phone: 'bg-emerald-500',
  email: 'bg-blue-500',
  sms: 'bg-purple-500',
}

export default function SequenceTimeline({
  steps,
  onStepEdit,
  onStepDelete,
  onStepAdd,
}: SequenceTimelineProps) {
  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order)

  return (
    <div className="relative">
      {sorted.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-400 text-sm mb-3">No steps in this sequence yet</p>
          <button
            onClick={onStepAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Add First Step
          </button>
        </div>
      ) : (
        <div className="space-y-0">
          {sorted.map((step, idx) => {
            const isLast = idx === sorted.length - 1
            const hasCondition = step.condition_field && step.condition_operator
            const dotColor = channelDotColor[step.channel] || 'bg-slate-400'

            return (
              <div key={step.id} className="relative">
                {/* Timeline connector */}
                <div className="flex gap-3">
                  {/* Vertical line and dot */}
                  <div className="flex flex-col items-center w-6 flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${dotColor} ring-4 ring-white z-10`} />
                    {!isLast && (
                      <div className="w-0.5 flex-1 border-l-2 border-dashed border-slate-200 min-h-[16px]" />
                    )}
                  </div>

                  {/* Step card */}
                  <div className={`flex-1 ${hasCondition ? 'ml-2' : ''} ${isLast ? 'pb-0' : 'pb-3'}`}>
                    {hasCondition && (
                      <div className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Conditional
                      </div>
                    )}
                    <SequenceStepCard
                      step={step}
                      onEdit={onStepEdit}
                      onDelete={onStepDelete}
                    />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add step button at bottom */}
          <div className="flex gap-3 pt-2">
            <div className="flex flex-col items-center w-6 flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-slate-200 ring-4 ring-white border-2 border-dashed border-slate-300" />
            </div>
            <button
              onClick={onStepAdd}
              className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors"
            >
              + Add Step
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
