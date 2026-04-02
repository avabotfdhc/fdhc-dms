import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AgreementsPage() {
  const supabase = await createClient()
  const { data: agreements, count } = await supabase
    .from('agreements')
    .select('*, clients(first_name, last_name)', { count: 'exact' })
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    closed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deals</h1>
          <p className="text-slate-500 text-sm">{count} agreements</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
        {agreements?.map(deal => {
          const buyer = deal.buyer as Record<string, string>
          const financials = deal.financials as Record<string, string | number>
          const client = deal.clients as Record<string, string>
          return (
            <Link
              key={deal.id}
              href={`/agreements/${deal.id}`}
              className="flex items-start gap-3 px-4 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                #{deal.deal_number || '—'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">
                  Deal #{deal.deal_number}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {client?.first_name} {client?.last_name}
                  {buyer?.name && ` · ${buyer.name}`}
                </p>
                {financials?.sale_price && (
                  <p className="text-sm font-medium text-slate-700 mt-1">
                    ${Number(financials.sale_price).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {deal.status && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[deal.status] || 'bg-slate-100 text-slate-600'}`}>
                    {deal.status}
                  </span>
                )}
                <span className="text-xs text-slate-400">Rev {deal.revision_number || 1}</span>
              </div>
            </Link>
          )
        })}
        {(!agreements || agreements.length === 0) && (
          <p className="px-4 py-8 text-center text-slate-400 text-sm">No deals found</p>
        )}
      </div>
    </div>
  )
}
