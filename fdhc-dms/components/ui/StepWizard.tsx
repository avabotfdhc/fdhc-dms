'use client'

import type { ReactNode } from 'react'

interface Step {
  key: string
  label: string
}

interface StepWizardProps {
  steps: Step[]
  currentStep: number
  children: ReactNode
  onBack?: () => void
  onNext?: () => void
}

export default function StepWizard({ steps, currentStep, children, onBack, onNext }: StepWizardProps) {
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  return (
    <div className="flex flex-col min-h-0">
      {/* Progress bar */}
      <div className="border-b border-slate-200 bg-white px-4 py-4">
        {/* Mobile: compact indicator */}
        <div className="sm:hidden flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm font-semibold text-slate-900">{steps[currentStep]?.label}</span>
        </div>

        {/* Progress track */}
        <div className="relative">
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop: step labels */}
        <div className="hidden sm:flex mt-3 justify-between">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-center gap-2 text-xs">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  i < currentStep
                    ? 'bg-blue-500 text-white'
                    : i === currentStep
                    ? 'bg-blue-500 text-white ring-2 ring-blue-200'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {i < currentStep ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`font-medium ${
                  i <= currentStep ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5">{children}</div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
        <button
          onClick={onBack}
          disabled={isFirst}
          className={`rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition-colors ${
            isFirst
              ? 'cursor-not-allowed text-slate-300'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  )
}
