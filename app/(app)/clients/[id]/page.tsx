import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!client) notFound()

  const fields = [
    { label: 'Email', value: client.email },
    { label: 'Phone', value: client.phone },
    { label: 'Source', value: client.source },
    { label: 'Status', value: client.status },
    { label: 'Address', value: client.address },
    { label: 'Delivery Address', value: [client.delivery_address, client.delivery_city, client.delivery_state, client.delivery_zip].filter(Boolean).join(', ') },
    { label: 'County', value: client.delivery_county },
    { label: 'Tags', value: Array.isArray(client.tags) ? client.tags.join(', ') : client.tags },
  ]

  const interactions: Record<string, string>[] = Array.isArray(client.interactions) ? client.interactions : []
  const activities: Record<string, string>[] = Array.isArray(client.activities) ? client.activities : []

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="text-slate-400 hover:text-slate-600 text-sm">← Clients</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">{client.first_name} {client.last_name}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl">
            {(client.first_name?.[0] || '') + (client.last_name?.[0] || '')}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{client.first_name} {client.last_name}</h1>
            <p className="text-slate-500 text-sm capitalize">{client.status} · {client.source}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map(f => f.value && (
            <div key={f.label}>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{f.label}</p>
              <p className="text-sm text-slate-800 mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      {client.preferences && Object.keys(client.preferences).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
          <h2 className="font-semibold text-slate-900 text-sm mb-3">Preferences</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(client.preferences).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-medium text-slate-400 capitalize">{k.replace(/_/g, ' ')}</p>
                <p className="text-sm text-slate-800">{String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactions */}
      {interactions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Interactions ({interactions.length})</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {interactions.slice(0, 10).map((item: Record<string, string>, i: number) => (
              <div key={i} className="px-5 py-3">
                <p className="text-sm text-slate-700 font-medium">{String(item.type || item.method || 'Interaction')}</p>
                {item.notes && <p className="text-sm text-slate-500 mt-0.5">{item.notes}</p>}
                {item.date && <p className="text-xs text-slate-400 mt-1">{item.date}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activities */}
      {activities.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Activities ({activities.length})</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {activities.slice(0, 10).map((item: Record<string, string>, i: number) => (
              <div key={i} className="px-5 py-3">
                <p className="text-sm text-slate-700">{String(item.type || item.action || 'Activity')}</p>
                {item.notes && <p className="text-sm text-slate-500 mt-0.5">{item.notes}</p>}
                {item.date && <p className="text-xs text-slate-400 mt-1">{item.date}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
