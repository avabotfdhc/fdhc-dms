'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import CurrencyInput from '@/components/ui/CurrencyInput'
import SaveIndicator from '@/components/ui/SaveIndicator'
import {
  calcMonthlyPayment,
  calcTotalCost,
  calcAmountFinanced,
  calcTotalInterest,
  DEFAULT_SCENARIOS,
  type FinancingScenario,
} from '@/lib/deal-utils'
import { calcSalesTax, type StateCompliance, type TaxLineItems } from '@/lib/tax-utils'

export interface Financials {
  base_home_price: number
  upgrades_total: number
  freight: number
  setup: number
  site_prep: number
  trade_in: number
  down_payment: number
  interest_rate: number
  term_months: number
  state_code: string
  // Calculated
  total_cost: number
  sales_tax: number
  amount_financed: number
  monthly_payment: number
  total_interest: number
}

interface StepFinancialsProps {
  financials: Financials
  onChange: (financials: Financials) => void
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error'
}

const STATE_CODES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

export default function StepFinancials({ financials, onChange, saveStatus }: StepFinancialsProps) {
  const [stateReqs, setStateReqs] = useState<StateCompliance | null>(null)

  // Fetch state compliance when state_code changes
  useEffect(() => {
    if (!financials.state_code) return
    const supabase = createClient()
    supabase
      .from('state_compliance_requirements')
      .select('*')
      .eq('state_code', financials.state_code.toUpperCase())
      .maybeSingle()
      .then(({ data }) => {
        if (data) setStateReqs(data as StateCompliance)
      })
  }, [financials.state_code])

  const recalc = useCallback(
    (updates: Partial<Financials>) => {
      const next = { ...financials, ...updates }
      const totalCost = calcTotalCost(
        next.base_home_price,
        next.upgrades_total,
        next.freight,
        next.setup,
        next.site_prep,
      )

      let salesTax = 0
      if (stateReqs) {
        const items: TaxLineItems = {
          homePrice: next.base_home_price + next.upgrades_total,
          freight: next.freight,
          setup: next.setup,
          options: 0,
          sitePrep: next.site_prep,
        }
        const taxResult = calcSalesTax(stateReqs, items)
        salesTax = taxResult.taxAmount
      }

      const totalWithTax = totalCost + salesTax
      const amountFinanced = calcAmountFinanced(totalWithTax, next.down_payment, next.trade_in)
      const monthlyPayment = calcMonthlyPayment(amountFinanced, next.interest_rate, next.term_months)
      const totalInterest = calcTotalInterest(monthlyPayment, next.term_months, amountFinanced)

      onChange({
        ...next,
        total_cost: totalWithTax,
        sales_tax: salesTax,
        amount_financed: amountFinanced,
        monthly_payment: monthlyPayment,
        total_interest: totalInterest,
      })
    },
    [financials, stateReqs, onChange],
  )

  // Recalc when stateReqs changes
  useEffect(() => {
    if (stateReqs) recalc({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateReqs])

  function applyScenario(s: FinancingScenario) {
    const totalPreTax = calcTotalCost(
      financials.base_home_price,
      financials.upgrades_total,
      financials.freight,
      financials.setup,
      financials.site_prep,
    )
    const dp = Math.round(totalPreTax * (s.downPaymentPercent / 100))
    recalc({
      down_payment: dp,
      interest_rate: s.annualRate,
      term_months: s.termYears * 12,
    })
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const fmtDecimal = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Financials</h2>
        <SaveIndicator status={saveStatus} />
      </div>

      {/* Scenario presets */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Quick Scenarios</p>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_SCENARIOS.map(s => (
            <button
              key={s.name}
              type="button"
              onClick={() => applyScenario(s)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              {s.name}
              <span className="block text-[10px] text-slate-400">
                {s.downPaymentPercent}% down / {s.annualRate}% / {s.termYears}yr
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cost inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CurrencyInput
          label="Base Home Price"
          name="base_home_price"
          value={financials.base_home_price}
          onChange={v => recalc({ base_home_price: v })}
        />
        <CurrencyInput
          label="Upgrades Total"
          name="upgrades_total"
          value={financials.upgrades_total}
          onChange={v => recalc({ upgrades_total: v })}
        />
        <CurrencyInput
          label="Freight"
          name="freight"
          value={financials.freight}
          onChange={v => recalc({ freight: v })}
        />
        <CurrencyInput
          label="Setup / Installation"
          name="setup"
          value={financials.setup}
          onChange={v => recalc({ setup: v })}
        />
        <CurrencyInput
          label="Site Prep"
          name="site_prep"
          value={financials.site_prep}
          onChange={v => recalc({ site_prep: v })}
        />
      </div>

      {/* State tax */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">State (for tax)</label>
        <select
          value={financials.state_code}
          onChange={e => recalc({ state_code: e.target.value })}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Select state...</option>
          {STATE_CODES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {stateReqs && (
          <p className="text-xs text-slate-500">
            {stateReqs.state_name} - {stateReqs.sales_tax_rate}% sales tax
          </p>
        )}
      </div>

      {/* Credits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CurrencyInput
          label="Trade-In Value"
          name="trade_in"
          value={financials.trade_in}
          onChange={v => recalc({ trade_in: v })}
        />
        <CurrencyInput
          label="Down Payment"
          name="down_payment"
          value={financials.down_payment}
          onChange={v => recalc({ down_payment: v })}
        />
      </div>

      {/* Financing terms */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Interest Rate (%)</label>
          <input
            type="number"
            step="0.01"
            value={financials.interest_rate}
            onChange={e => recalc({ interest_rate: parseFloat(e.target.value) || 0 })}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Term (months)</label>
          <input
            type="number"
            value={financials.term_months}
            onChange={e => recalc({ term_months: parseInt(e.target.value) || 0 })}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Calculated summary */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal (before tax)</span>
          <span className="font-medium">{fmt(financials.total_cost - financials.sales_tax)}</span>
        </div>
        {financials.sales_tax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Sales Tax</span>
            <span className="font-medium">{fmt(financials.sales_tax)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Total Cost</span>
          <span className="font-semibold">{fmt(financials.total_cost)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Amount Financed</span>
          <span className="font-semibold">{fmt(financials.amount_financed)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Total Interest</span>
          <span className="font-medium text-amber-700">{fmt(financials.total_interest)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-slate-200">
          <span className="text-base font-bold text-slate-900">Monthly Payment</span>
          <span className="text-lg font-bold text-blue-600">{fmtDecimal(financials.monthly_payment)}</span>
        </div>
      </div>
    </div>
  )
}
