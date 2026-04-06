'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SignatureWorkflowProps {
  agreement: Record<string, unknown>
}

interface SignatureStep {
  key: 'client' | 'sales_rep' | 'manager'
  label: string
  field: string
  signedAt: string | null
}

export default function SignatureWorkflow({ agreement }: SignatureWorkflowProps) {
  const supabase = createClient()
  const [signing, setSigning] = useState(false)
  const [localAgreement, setLocalAgreement] = useState(agreement)

  const steps: SignatureStep[] = [
    {
      key: 'client',
      label: 'Client',
      field: 'client_signed_at',
      signedAt: (localAgreement.client_signed_at as string) || null,
    },
    {
      key: 'sales_rep',
      label: 'Sales Rep',
      field: 'sales_rep_signed_at',
      signedAt: (localAgreement.sales_rep_signed_at as string) || null,
    },
    {
      key: 'manager',
      label: 'Manager',
      field: 'manager_signed_at',
      signedAt: (localAgreement.manager_signed_at as string) || null,
    },
  ]

  // Find the active step (first unsigned)
  const activeIndex = steps.findIndex(s => !s.signedAt)

  const recordSignature = useCallback(async (step: SignatureStep) => {
    setSigning(true)
    const now = new Date().toISOString()

    const update: Record<string, unknown> = {
      [step.field]: now,
      updated_at: now,
    }

    // Check if all will be signed after this
    const allSigned = steps.every(s =>
      s.key === step.key ? true : !!s.signedAt
    )
    if (allSigned) {
      update.status = 'signed'
    }

    await supabase
      .from('purchase_agreements')
      .update(update)
      .eq('id', localAgreement.id)

    setLocalAgreement(prev => ({
      ...prev,
      [step.field]: now,
      ...(allSigned ? { status: 'signed' } : {}),
    }))
    setSigning(false)
  }, [steps, localAgreement.id, supabase])

  const allSigned = steps.every(s => !!s.signedAt)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-4">Signature Workflow</h2>

      {allSigned && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-sm font-medium text-emerald-800">All signatures collected. Agreement is signed.</p>
        </div>
      )}

      {/* 3-step visual */}
      <div className="flex items-start justify-between gap-2">
        {steps.map((step, i) => {
          const isSigned = !!step.signedAt
          const isActive = i === activeIndex
          const isPast = i < activeIndex || (activeIndex === -1)

          return (
            <div key={step.key} className="flex-1 text-center">
              {/* Connector line + circle */}
              <div className="flex items-center justify-center mb-2">
                {i > 0 && (
                  <div className={`h-0.5 flex-1 ${isPast || isSigned ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
                <div
                  className={`shrink-0 flex items-center justify-center h-10 w-10 rounded-full border-2 transition-colors ${
                    isSigned
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : isActive
                      ? 'border-blue-500 bg-blue-50 text-blue-600 ring-4 ring-blue-100'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {isSigned ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-semibold">{i + 1}</span>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 ${isSigned ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </div>

              {/* Label */}
              <p className={`text-xs font-medium ${isSigned ? 'text-emerald-700' : isActive ? 'text-blue-700' : 'text-slate-400'}`}>
                {step.label}
              </p>

              {/* Status */}
              {isSigned ? (
                <p className="text-[10px] text-emerald-600 mt-0.5">
                  Signed {new Date(step.signedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-0.5">Pending</p>
              )}

              {/* Record button for active step */}
              {isActive && (
                <button
                  onClick={() => recordSignature(step)}
                  disabled={signing}
                  className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {signing ? 'Recording...' : 'Record Signature'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
