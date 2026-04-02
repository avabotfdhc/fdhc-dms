import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function AgreementDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: deal } = await supabase
    .from('agreements')
    .select('*, clients(first_name, last_name, email, phone)')
    .eq('id', params.id)
    .single()

  if (!deal) notFound()

  const buyer = (deal.buyer as Record<string, string>) || {}
  const buyer2 = (deal.buyer2 as Record<string, string>) || {}
  const model = (deal.model as Record<string, string>) || {}
  const financials = (deal.financials as Record<string, string | number>) || {}
  const upgrades = (deal.upgrades as Record<string, string | number>[]) || []
  const history = (deal.history as Record<string, string>[]) || []
  const client = (deal.clients as Record<string, string>) || {}

  const finFields = [
    { label: 'Sale Price', value: financials.sale_price ? `$${Number(financials.sale_price).toLocaleString()}` : null },
    { label: 'Down Payment', value: financials.down_payment ? `$${Number(financials.down_payment).toLocaleString()}` : null },
    { label: 'Trade-In', value: financials.trade_in ? `$${Number(financials.trade_in).toLocaleString()}` : null },
    { label: 'Amount Financed', value: financials.amount_financed ? `$${Number(financials.amount_financed).toLocaleString()}` : null },
    { label: 'Interest Rate', value: financials.interest_rate ? `${financials.interest_rate}%` : null },
    { label: 'Term', value: financials.term ? `${financials.term} months` : null },
    { label: 'Monthly Payment', value: financials.monthly_payment ? `$${Number(financials.monthly_payment).toLocaleString()}` : null },
    { label: 'Freight', value: financials.freight ? `$${Number(financials.freight).toLocaleString()}` : null },
    { label: 'Setup', value: financials.setup ? `$${Number(financials.setup).toLocaleString()}` : null },
    { label: 'Total', value: financials.total ? `$${Number(financials.total).toLocaleString()}` : null },
  ]

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/agreements" className="text-slate-400 hover:text-slate-600 text-sm">← Deals</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium">Deal #{deal.deal_number}</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Deal #{deal.deal_number}</h1>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium capitalize">
          {deal.status}
        </span>
      </div>

      {/* Buyer */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Buyer</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-400">Name</p>
            <p className="text-sm font-medium text-slate-800">{String(buyer.name || `${client.first_name} ${client.last_name}` || '—')}</p>
          </div>
          {client.email && (
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm text-slate-800">{String(client.email)}</p>
            </div>
          )}
          {client.phone && (
            <div>
              <p className="text-xs text-slate-400">Phone</p>
              <p className="text-sm text-slate-800">{String(client.phone)}</p>
            </div>
          )}
          {buyer.address && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400">Address</p>
              <p className="text-sm text-slate-800">{String(buyer.address)}</p>
            </div>
          )}
          {Object.keys(buyer2).length > 0 && buyer2.name && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400">Co-Buyer</p>
              <p className="text-sm text-slate-800">{String(buyer2.name)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Model */}
      {Object.keys(model).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Home</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(model).map(([k, v]) => v && (
              <div key={k}>
                <p className="text-xs text-slate-400 capitalize">{k.replace(/_/g, ' ')}</p>
                <p className="text-sm text-slate-800">{String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financials */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Financials</h2>
        <div className="grid grid-cols-2 gap-3">
          {finFields.filter(f => f.value).map(f => (
            <div key={f.label}>
              <p className="text-xs text-slate-400">{f.label}</p>
              <p className="text-sm font-semibold text-slate-900">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrades */}
      {upgrades.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Upgrades</h2>
          <div className="space-y-2">
            {upgrades.map((u, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-slate-700">{String(u.name || u.description || u.item || 'Upgrade')}</span>
                {u.price && <span className="font-medium text-slate-900">${Number(u.price).toLocaleString()}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">History</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {history.map((h, i) => (
              <div key={i} className="px-5 py-3">
                <p className="text-sm text-slate-700">{String(h.action || h.event || 'Update')}</p>
                {h.date && <p className="text-xs text-slate-400 mt-0.5">{String(h.date)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
