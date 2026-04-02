'use client'

import { useState, useCallback } from 'react'

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
  const amountFinanced = Math.max(0, totalCost - scenario.downPayment - scenario.tradeIn)

  if (amountFinanced <= 0 || scenario.term <= 0) {
    return { monthlyPayment: 0, amountFinanced, totalCost, totalInterest: 0 }
  }

  const monthlyRate = scenario.interestRate / 100 / 12
  let monthlyPayment: number
  if (monthlyRate === 0) {
    monthlyPayment = amountFinanced / scenario.term
  } else {
    monthlyPayment =
      (amountFinanced * monthlyRate * Math.pow(1 + monthlyRate, scenario.term)) /
      (Math.pow(1 + monthlyRate, scenario.term) - 1)
  }

  const totalPaid = monthlyPayment * scenario.term
  const totalInterest = totalPaid - amountFinanced

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

export default function DeskingPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([
    defaultScenario('Option A'),
    defaultScenario('Option B'),
    defaultScenario('Option C'),
  ])

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

  const inputClass =
    'w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelClass = 'text-xs text-slate-500 mb-0.5'

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Desking Matrix</h1>
        <p className="text-slate-500 text-sm">Side-by-side financing comparison</p>
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
                { label: 'Total Purchase', key: 'totalCost' as keyof ReturnType<typeof calcPayment>, bold: false },
                { label: 'Amount Financed', key: 'amountFinanced' as keyof ReturnType<typeof calcPayment>, bold: false },
                { label: 'Total Interest', key: 'totalInterest' as keyof ReturnType<typeof calcPayment>, bold: false, amber: true },
                { label: 'Monthly Payment', key: 'monthlyPayment' as keyof ReturnType<typeof calcPayment>, bold: true, blue: true },
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
                        ? fmtDecimal(r[row.key] as number)
                        : fmt(r[row.key] as number)}
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
