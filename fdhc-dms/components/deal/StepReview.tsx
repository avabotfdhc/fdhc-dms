'use client'

import type { Financials } from './StepFinancials'

interface ClientInfo {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
}

interface ModelInfo {
  id: string
  name: string
  manufacturer: string
  base_price: number
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
}

interface UpgradeInfo {
  id: string
  name: string
  price: number
  custom?: boolean
}

interface StepReviewProps {
  client: ClientInfo | null
  model: ModelInfo | null
  upgrades: UpgradeInfo[]
  financials: Financials
  onCreateDeal: () => void
  creating: boolean
  isEdit?: boolean
}

export default function StepReview({
  client,
  model,
  upgrades,
  financials,
  onCreateDeal,
  creating,
  isEdit,
}: StepReviewProps) {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const fmtDecimal = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Review Deal</h2>

      {/* Client */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Client</h3>
        {client ? (
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {client.first_name} {client.last_name}
            </p>
            {client.email && <p className="text-xs text-slate-600">{client.email}</p>}
            {client.phone && <p className="text-xs text-slate-600">{client.phone}</p>}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No client selected</p>
        )}
      </div>

      {/* Home */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Home</h3>
        {model ? (
          <div>
            <p className="text-sm font-semibold text-slate-900">{model.name}</p>
            <p className="text-xs text-slate-600">{model.manufacturer}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              <span className="text-xs text-slate-600">{fmt(model.base_price)}</span>
              {model.bedrooms && (
                <span className="text-xs text-slate-600">
                  {model.bedrooms} BR / {model.bathrooms} BA
                </span>
              )}
              {model.sqft && (
                <span className="text-xs text-slate-600">{model.sqft.toLocaleString()} sqft</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No model selected</p>
        )}
      </div>

      {/* Upgrades */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Upgrades ({upgrades.length})
        </h3>
        {upgrades.length > 0 ? (
          <div className="space-y-1.5">
            {upgrades.map(u => (
              <div key={u.id} className="flex justify-between text-sm">
                <span className="text-slate-700">
                  {u.name}
                  {u.custom && (
                    <span className="ml-1 text-xs text-purple-600">(custom)</span>
                  )}
                </span>
                <span className="font-medium text-slate-900">{fmt(u.price)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-1.5 border-t border-slate-100">
              <span className="font-medium text-slate-700">Upgrades Total</span>
              <span className="font-semibold text-slate-900">
                {fmt(upgrades.reduce((s, u) => s + u.price, 0))}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No upgrades selected</p>
        )}
      </div>

      {/* Financial Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Financial Summary
        </h3>
        <div className="space-y-1.5">
          <Row label="Base Home Price" value={fmt(financials.base_home_price)} />
          <Row label="Upgrades" value={fmt(financials.upgrades_total)} />
          <Row label="Freight" value={fmt(financials.freight)} />
          <Row label="Setup" value={fmt(financials.setup)} />
          <Row label="Site Prep" value={fmt(financials.site_prep)} />
          {financials.sales_tax > 0 && (
            <Row label={`Sales Tax (${financials.state_code})`} value={fmt(financials.sales_tax)} />
          )}
          <div className="border-t border-slate-100 pt-1.5">
            <Row label="Total Cost" value={fmt(financials.total_cost)} bold />
          </div>
          <Row label="Down Payment" value={`-${fmt(financials.down_payment)}`} />
          {financials.trade_in > 0 && (
            <Row label="Trade-In" value={`-${fmt(financials.trade_in)}`} />
          )}
          <div className="border-t border-slate-100 pt-1.5">
            <Row label="Amount Financed" value={fmt(financials.amount_financed)} bold />
          </div>
          <Row label="Interest Rate" value={`${financials.interest_rate}%`} />
          <Row label="Term" value={`${financials.term_months} months`} />
          <Row label="Total Interest" value={fmt(financials.total_interest)} amber />
          <div className="border-t border-slate-200 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-base font-bold text-slate-900">Monthly Payment</span>
              <span className="text-lg font-bold text-blue-600">
                {fmtDecimal(financials.monthly_payment)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Create button */}
      <button
        type="button"
        onClick={onCreateDeal}
        disabled={creating || !client || !model}
        className={`w-full rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors ${
          creating || !client || !model
            ? 'bg-slate-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {creating
          ? 'Saving...'
          : isEdit
          ? 'Save Changes'
          : 'Create Deal'}
      </button>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  amber,
}: {
  label: string
  value: string
  bold?: boolean
  amber?: boolean
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className={bold ? 'font-semibold text-slate-900' : 'text-slate-600'}>{label}</span>
      <span
        className={
          bold
            ? 'font-bold text-slate-900'
            : amber
            ? 'font-medium text-amber-700'
            : 'font-medium text-slate-900'
        }
      >
        {value}
      </span>
    </div>
  )
}
