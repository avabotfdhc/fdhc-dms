import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ClientDetailClient from './ClientDetailClient'
import { scoreLeadClient } from '@/lib/lead-score'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!client) notFound()

  // Fetch assigned rep name
  let repName: string | null = null
  if (client.assigned_to) {
    const { data: rep } = await supabase
      .from('profiles')
      .select('name, username')
      .eq('id', client.assigned_to)
      .single()
    if (rep) {
      repName = rep.name || rep.username || null
    }
  }

  // Fetch deals and follow-ups for richer lead scoring
  const [{ data: deals }, { data: followUps }] = await Promise.all([
    supabase.from('agreements').select('id').eq('client_id', client.id).in('status', ['pending', 'approved', 'active']),
    supabase.from('scheduled_follow_ups').select('id, outcome').eq('client_id', client.id),
  ])

  const score = scoreLeadClient({
    status: client.status || '',
    land_status: client.land_status,
    source: client.source,
    contact_attempts: client.contact_attempts || 0,
    interactions: (followUps || []).map(f => ({ outcome: f.outcome })),
    created_at: client.created_at,
    email: client.email,
    phone: client.phone,
    has_deal: (deals || []).length > 0,
    next_follow_up_at: client.next_follow_up_at,
    tags: client.tags,
  })

  const fields = [
    { label: 'Email', value: client.email },
    { label: 'Phone', value: client.phone },
    { label: 'Source', value: client.source },
    { label: 'Status', value: client.status },
    { label: 'Land Status', value: client.land_status ? client.land_status.replace(/_/g, ' ') : null },
    { label: 'Address', value: client.address },
    { label: 'Delivery Address', value: [client.delivery_address, client.delivery_city, client.delivery_state, client.delivery_zip].filter(Boolean).join(', ') },
    { label: 'County', value: client.delivery_county },
    { label: 'Assigned To', value: repName },
    { label: 'Contact Attempts', value: client.contact_attempts ? String(client.contact_attempts) : null },
    { label: 'Next Follow-up', value: client.next_follow_up_at ? new Date(client.next_follow_up_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null },
    { label: 'Tags', value: Array.isArray(client.tags) ? client.tags.join(', ') : client.tags },
  ]

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="text-slate-400 hover:text-slate-600 text-sm">&larr; Clients</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">{client.first_name} {client.last_name}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl">
              {(client.first_name?.[0] || '') + (client.last_name?.[0] || '')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{client.first_name} {client.last_name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${score.bg} ${score.color}`}>
                  {score.emoji} {score.label} · {score.score}
                </span>
              </div>
              <p className="text-slate-500 text-sm capitalize">{client.status} · {client.source}</p>
            </div>
          </div>
          <Link
            href={`/clients/${client.id}/edit`}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Edit
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map(f => f.value && (
            <div key={f.label}>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{f.label}</p>
              <p className="text-sm text-slate-800 mt-0.5 capitalize">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions + Activity Timeline (client component) */}
      <ClientDetailClient
        clientId={client.id}
        phone={client.phone}
        email={client.email}
      />

      {/* Preferences */}
      {client.preferences && typeof client.preferences === 'object' && Object.keys(client.preferences as Record<string, unknown>).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mt-4">
          <h2 className="font-semibold text-slate-900 text-sm mb-3">Preferences</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(client.preferences as Record<string, unknown>).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-medium text-slate-400 capitalize">{k.replace(/_/g, ' ')}</p>
                <p className="text-sm text-slate-800">{String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
