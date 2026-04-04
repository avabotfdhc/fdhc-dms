'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getStateRequirements, getCoolingOffDate, type StateCompliance, type Disclosure } from '@/lib/tax-utils'
import { getRequiredDisclosures } from '@/lib/agreement-utils'

interface LegalDisclosuresFormProps {
  stateCode: string
  agreementId: string
}

interface DisclosureCheck {
  code: string
  title: string
  text: string
  requires_signature: boolean
  included: boolean
}

// Standard federal disclosures always required
const FEDERAL_DISCLOSURES: Disclosure[] = [
  {
    code: 'FORMALDEHYDE',
    title: 'Formaldehyde Disclosure',
    text: 'This manufactured home may contain formaldehyde-based resins in certain building products. Formaldehyde levels in indoor air can cause health problems. This disclosure is required under the HUD Manufactured Home Construction and Safety Standards.',
    requires_signature: false,
  },
  {
    code: 'HUD_INSTALL',
    title: 'HUD Installation Standards (24 CFR 3285)',
    text: 'This manufactured home must be installed in accordance with the Federal Manufactured Home Installation Standards (24 CFR Part 3285) and any applicable state installation standards.',
    requires_signature: false,
  },
]

export default function LegalDisclosuresForm({ stateCode, agreementId }: LegalDisclosuresFormProps) {
  const supabase = createClient()
  const [compliance, setCompliance] = useState<StateCompliance | null>(null)
  const [disclosures, setDisclosures] = useState<DisclosureCheck[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const stateReq = await getStateRequirements(supabase, stateCode)
    setCompliance(stateReq)

    // Build checklist: federal + state-specific
    const stateDisclosures = getRequiredDisclosures(stateCode, stateReq)
    const allDisclosures: Disclosure[] = [...FEDERAL_DISCLOSURES, ...stateDisclosures]

    // Load existing saved disclosures
    const { data: agreement } = await supabase
      .from('purchase_agreements')
      .select('disclosures')
      .eq('id', agreementId)
      .single()

    const savedDisclosures = (agreement?.disclosures as Record<string, boolean>) || {}

    setDisclosures(
      allDisclosures.map(d => ({
        ...d,
        included: savedDisclosures[d.code] === true,
      }))
    )
    setLoading(false)
  }, [stateCode, agreementId, supabase])

  useEffect(() => { loadData() }, [loadData])

  async function handleToggle(code: string) {
    const updated = disclosures.map(d =>
      d.code === code ? { ...d, included: !d.included } : d
    )
    setDisclosures(updated)

    // Save to DB
    setSaving(true)
    const disclosureMap: Record<string, boolean> = {}
    updated.forEach(d => { disclosureMap[d.code] = d.included })

    await supabase
      .from('purchase_agreements')
      .update({ disclosures: disclosureMap, updated_at: new Date().toISOString() })
      .eq('id', agreementId)
    setSaving(false)
  }

  const coolingOffDate = compliance
    ? getCoolingOffDate(new Date(), compliance.cooling_off_days)
    : null

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Required Disclosures</h3>
        {saving && <span className="text-xs text-amber-600">Saving...</span>}
      </div>

      {/* Cooling off period */}
      {compliance && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800">
            Cooling-Off Period: {compliance.cooling_off_days} days
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            Right to cancel expires: {coolingOffDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      )}

      {/* HUD State Code */}
      {compliance && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-medium text-blue-800">
            HUD Installation Standards (24 CFR 3285)
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            State code: {stateCode} &mdash; {compliance.state_name}
          </p>
        </div>
      )}

      {/* Disclosure checklist */}
      <div className="space-y-3">
        {disclosures.map(d => (
          <label
            key={d.code}
            className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <input
              type="checkbox"
              checked={d.included}
              onChange={() => handleToggle(d.code)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{d.title}</span>
                {d.requires_signature && (
                  <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-inset ring-red-200">
                    Signature Required
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{d.text}</p>
            </div>
          </label>
        ))}
      </div>

      {disclosures.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">
          No specific disclosures found for this state.
        </p>
      )}
    </div>
  )
}
