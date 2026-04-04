'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  calcMonthlyPayment,
  calcAmountFinanced,
  calcTotalInterest,
} from '@/lib/deal-utils'

interface Scenario {
  name: string
  homePrice: number
  downPayment: number
  interestRate: number
  term: number
  freight: number
  setup: number
  tradeIn: number
}

function calcPayment(scenario: Scenario): {
  monthlyPayment: number
  amountFinanced: number
  totalCost: number
  totalInterest: number
} {
  const totalCost = scenario.homePrice + scenario.freight + scenario.setup
  const amountFinanced = calcAmountFinanced(totalCost, scenario.downPayment, scenario.tradeIn)
  const monthlyPayment = calcMonthlyPayment(amountFinanced, scenario.interestRate, scenario.term)
  const totalInterest = calcTotalInterest(monthlyPayment, scenario.term, amountFinanced)

  return { monthlyPayment, amountFinanced, totalCost, totalInterest }
}

const defaultScenario = (name: string): Scenario => ({
  name,
  homePrice: 89900,
  downPayment: 10000,
  interestRate: 7.99,
  term: 180,
  freight: 3500,
  setup: 2500,
  tradeIn: 0,
})

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const fmtDecimal = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

export default function DeskingClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState(0)

  const [scenarios, setScenarios] = useState<Scenario[]>([
    defaultScenario('Option A'),
    defaultScenario('Option B'),
    defaultScenario('Option C'),
  ])

  // Pre-fill from query params on mount
  useEffect(() => {
    const hp = searchParams.get('homePrice')
    const dp = searchParams.get('downPayment')
    const rate = searchParams.get('rate')
    const term = searchParams.get('term')
    const freight = searchParams.get('freight')
    const setup = searchParams.get('setup')

    if (hp || dp || rate || term || freight || setup) {
      setScenarios(prev =>
        prev.map((s, i) => {
          if (i !== 0) return s
          return {
            ...s,
            homePrice: hp ? parseFloat(hp) : s.homePrice,
            downPayment: dp ? parseFloat(dp) : s.downPayment,
            interestRate: rate ? parseFloat(rate) : s.interestRate,
            term: term ? parseInt(term) : s.term,
            freight: freight ? parseFloat(freight) : s.freight,
            setup: setup ? parseFloat(setup) : s.setup,
          }
        }),
      )
    }
  }, [searchParams])

  const update = useCallback((idx: number, field: keyof Scenario, value: string) => {
    setScenarios(prev =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, [field]: field === 'name' ? value : parseFloat(value) || 0 }
          : s
      )
    )
  }, [])

  const results = scenarios.map(calcPayment)

  async function handleSaveToDeal() {
    setSaving(true)
    const supabase = createClient()
    const s = scenarios[selectedScenario]
    const r = results[selectedScenario]

    try {
      const { count } = await supabase
        .from('agreements')
        .select('*', { count: 'exact', head: true })
      const dealNumber = (count || 0) + 1

      const { data, error } = await supabase
        .from('agreements')
        .insert({
          deal_number: dealNumber,
          status: 'draft',
          financials: {
            sale_price: r.totalCost,
            base_home_price: s.homePrice,
            freight: s.freight,
            setup: s.setup,
            down_payment: s.downPayment,
            trade_in: s.tradeIn,
            interest_rate: s.interestRate,
            term: s.term,
            amount_financed: r.amountFinanced,
            monthly_payment: r.monthlyPayment,
            total_interest: r.totalInterest,
            total: r.totalCost,
          },
          revision_number: 1,
          history: [
            {
              action: 'Created from desking scenario',
              date: new Date().toISOString(),
            },
          ],
        })
        .select('id')
        .single()

      if (error) throw error
      if (data) router.push(`/agreements/${data.id}`)
    } catch {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelClass = 'text-xs text-slate-500 mb-0.5'

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Desking Matrix</h1>
          <p className="text-slate-500 text-sm">Side-by-side financing comparison</p>
        </div>
        <button
          onClick={handleSaveToDeal}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save to Deal'}
        </button>
      </div>

      {/* Scenario selector for Save to Deal */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-slate-500">Save scenario:</span>
        {scenarios.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelectedScenario(i)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedScenario === i
                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-4 md:hidden">
        {scenarios.map((s, i) => {
          const r = results[i]
          return (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-800 px-4 py-2.5">
                <input
                  value={s.name}
                  onChange={e => update(i, 'name', e.target.value)}
                  className="bg-transparent text-white font-semibold text-sm w-full focus:outline-none"
                />
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className={labelClass}>Home Price</p>
                  <input type="number" value={s.homePrice} onChange={e => update(i, 'homePrice', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <p className={labelClass}>Down Payment</p>
                  <input type="number" value={s.downPayment} onChange={e => update(i, 'downPayment', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <p className={labelClass}>Trade-In Value</p>
                  <input type="number" value={s.tradeIn} onChange={e => update(i, 'tradeIn', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <p className={labelClass}>Interest Rate (%)</p>
                  <input type="number" step="0.01" value={s.interestRate} onChange={e => update(i, 'interestRate', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <p className={labelClass}>Term (months)</p>
                  <input type="number" value={s.term} onChange={e => update(i, 'term', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <p className={labelClass}>Freight</p>
                  <input type="number" value={s.freight} onChange={e => update(i, 'freight', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <p className={labelClass}>Setup / Installation</p>
                  <input type="number" value={s.setup} onChange={e => update(i, 'setup', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Total Purchase</span>
                  <span className="text-sm font-semibold">{fmt(r.totalCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Amount Financed</span>
                  <span className="text-sm font-semibold">{fmt(r.amountFinanced)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Total Interest</span>
                  <span className="text-sm font-semibold text-amber-700">{fmt(r.totalInterest)}</span>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-slate-200">
                  <span className="text-base font-bold text-slate-900">Monthly Payment</span>
                  <span className="text-lg font-bold text-blue-600">{fmtDecimal(r.monthlyPayment)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: side-by-side columns */}
      <div className="hidden md:block">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium w-40">Field</th>
                {scenarios.map((s, i) => (
                  <th key={i} className="px-4 py-3 text-center">
                    <input
                      value={s.name}
                      onChange={e => update(i, 'name', e.target.value)}
                      className="bg-transparent text-white font-semibold text-sm w-full text-center focus:outline-none"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { label: 'Home Price', field: 'homePrice' as keyof Scenario, type: 'number' },
                { label: 'Down Payment', field: 'downPayment' as keyof Scenario, type: 'number' },
                { label: 'Trade-In Value', field: 'tradeIn' as keyof Scenario, type: 'number' },
                { label: 'Interest Rate (%)', field: 'interestRate' as keyof Scenario, type: 'number', step: '0.01' },
                { label: 'Term (months)', field: 'term' as keyof Scenario, type: 'number' },
                { label: 'Freight', field: 'freight' as keyof Scenario, type: 'number' },
                { label: 'Setup / Install', field: 'setup' as keyof Scenario, type: 'number' },
              ].map(row => (
                <tr key={row.field} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-sm text-slate-600">{row.label}</td>
                  {scenarios.map((s, i) => (
                    <td key={i} className="px-4 py-2">
                      <input
                        type={row.type}
                        step={row.step}
                        value={s[row.field] as number}
                        onChange={e => update(i, row.field, e.target.value)}
                        className={inputClass}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              {[
                { label: 'Total Purchase', key: 'totalCost' as const, bold: false },
                { label: 'Amount Financed', key: 'amountFinanced' as const, bold: false },
                { label: 'Total Interest', key: 'totalInterest' as const, bold: false, amber: true },
                { label: 'Monthly Payment', key: 'monthlyPayment' as const, bold: true, blue: true },
              ].map(row => (
                <tr key={row.key} className={row.bold ? 'border-t border-slate-200' : ''}>
                  <td className={`px-4 py-2.5 text-sm ${row.bold ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                    {row.label}
                  </td>
                  {results.map((r, i) => (
                    <td key={i} className={`px-4 py-2.5 text-center font-semibold ${
                      row.blue ? 'text-blue-600 text-lg' : row.amber ? 'text-amber-700' : 'text-slate-900'
                    }`}>
                      {row.key === 'monthlyPayment'
                        ? fmtDecimal(r[row.key])
                        : fmt(r[row.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
