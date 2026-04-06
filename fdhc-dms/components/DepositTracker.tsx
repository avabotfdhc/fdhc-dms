'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { validateDeposit, getStateRequirements } from '@/lib/tax-utils'
import CurrencyInput from '@/components/ui/CurrencyInput'
import FormField from '@/components/ui/FormField'
import Badge from '@/components/ui/Badge'

interface DepositTrackerProps {
  agreement: Record<string, unknown>
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'wire', label: 'Wire Transfer' },
]

export default function DepositTracker({ agreement }: DepositTrackerProps) {
  const supabase = createClient()
  const [depositAmount, setDepositAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [maxDepositPercent, setMaxDepositPercent] = useState(100)

  const currentDeposit = Number(agreement.deposit_amount) || 0
  const depositStatus = (agreement.deposit_status as string) || 'unpaid'
  const depositMethod = (agreement.deposit_method as string) || null
  const depositDateSaved = (agreement.deposit_date as string) || null
  const fin = (agreement.financial_terms as Record<string, number>) || {}
  const totalPrice = fin.total_cost || 0
  const stateCode = (agreement.state_code as string) || ''

  const [localDeposit, setLocalDeposit] = useState(currentDeposit)
  const [localStatus, setLocalStatus] = useState(depositStatus)
  const [localMethod, setLocalMethod] = useState(depositMethod)
  const [localDate, setLocalDate] = useState(depositDateSaved)

  // Load state max deposit percent
  useEffect(() => {
    async function loadStateRules() {
      if (!stateCode) return
      const sr = await getStateRequirements(supabase, stateCode)
      if (sr) setMaxDepositPercent(sr.max_deposit_percent)
    }
    loadStateRules()
  }, [stateCode, supabase])

  async function handleRecordDeposit() {
    setError(null)
    if (!depositAmount || depositAmount <= 0) {
      setError('Please enter a valid deposit amount.')
      return
    }
    if (!paymentMethod) {
      setError('Please select a payment method.')
      return
    }

    // Validate against state maximum
    const validation = validateDeposit(depositAmount, totalPrice, maxDepositPercent)
    if (!validation.valid) {
      setError(
        `Deposit cannot exceed ${maxDepositPercent}% of total price ($${validation.maxAllowed.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`
      )
      return
    }

    setSaving(true)
    try {
      // Update purchase agreement
      const { error: updateErr } = await supabase
        .from('purchase_agreements')
        .update({
          deposit_amount: depositAmount,
          deposit_status: 'paid',
          deposit_method: paymentMethod,
          deposit_date: depositDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agreement.id)

      if (updateErr) throw new Error(updateErr.message)

      // Create ledger entry
      await supabase.from('ledger_entries').insert({
        agreement_id: agreement.id,
        type: 'deposit',
        amount: depositAmount,
        payment_method: paymentMethod,
        date: depositDate,
        description: `Deposit payment - ${paymentMethod}`,
        created_at: new Date().toISOString(),
      })

      setLocalDeposit(depositAmount)
      setLocalStatus('paid')
      setLocalMethod(paymentMethod)
      setLocalDate(depositDate)
      setDepositAmount(0)
      setPaymentMethod('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record deposit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Deposit Tracking</h2>
        <Badge
          text={localStatus === 'paid' ? 'Paid' : 'Unpaid'}
          variant={localStatus === 'paid' ? 'success' : 'warning'}
        />
      </div>

      {/* Current deposit info */}
      {localDeposit > 0 && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-emerald-600 text-xs">Amount</span>
              <p className="font-semibold text-emerald-900">
                ${localDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-emerald-600 text-xs">Method</span>
              <p className="font-medium text-emerald-900 capitalize">{localMethod || '---'}</p>
            </div>
            <div>
              <span className="text-emerald-600 text-xs">Date</span>
              <p className="font-medium text-emerald-900">
                {localDate ? new Date(localDate).toLocaleDateString('en-US') : '---'}
              </p>
            </div>
            <div>
              <span className="text-emerald-600 text-xs">Status</span>
              <p className="font-medium text-emerald-900 capitalize">{localStatus}</p>
            </div>
          </div>
        </div>
      )}

      {/* Record Deposit Form */}
      {localStatus !== 'paid' && (
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <CurrencyInput
            label="Deposit Amount"
            name="depositAmount"
            value={depositAmount}
            onChange={setDepositAmount}
          />

          {totalPrice > 0 && (
            <p className="text-xs text-slate-500">
              Max deposit: {maxDepositPercent}% of ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} = ${
                (totalPrice * maxDepositPercent / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })
              }
            </p>
          )}

          <FormField
            label="Payment Method"
            name="paymentMethod"
            type="select"
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            options={PAYMENT_METHODS}
            required
          />

          <FormField
            label="Date"
            name="depositDate"
            value={depositDate}
            onChange={e => setDepositDate(e.target.value)}
          />

          <button
            onClick={handleRecordDeposit}
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Recording...' : 'Record Deposit'}
          </button>
        </div>
      )}
    </div>
  )
}
