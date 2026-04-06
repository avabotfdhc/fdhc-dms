import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'neutral'> = {
  open: 'warning',
  in_progress: 'info',
  closed: 'success',
}

const priorityVariant: Record<string, 'neutral' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'neutral',
  high: 'warning',
  urgent: 'danger',
}

export default async function ServicePage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = await createClient()
  const filter = searchParams.status || 'all'

  let query = supabase
    .from('service_tickets')
    .select('*, clients(first_name, last_name)')
    .order('created_at', { ascending: false })

  if (filter !== 'all') {
    query = query.eq('status', filter)
  }

  const { data: tickets } = await query

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Tickets</h1>
          <p className="text-slate-500 text-sm">{tickets?.length || 0} tickets</p>
        </div>
        <Link
          href="/service/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + New Ticket
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['all', 'open', 'in_progress', 'closed'].map(s => (
          <Link
            key={s}
            href={s === 'all' ? '/service' : `/service?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === s
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </Link>
        ))}
      </div>

      {/* Tickets list */}
      <div className="space-y-2">
        {tickets?.map((t: Record<string, unknown>) => {
          const client = t.clients as Record<string, string> | null
          const clientName = client
            ? `${client.first_name || ''} ${client.last_name || ''}`.trim()
            : '—'

          return (
            <Link
              key={String(t.id)}
              href={`/service/${t.id}`}
              className="block bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400 font-mono">#{String(t.id).slice(0, 8)}</span>
                    <Badge text={String(t.status || 'open')} variant={statusVariant[String(t.status)] || 'neutral'} size="sm" />
                    {t.priority ? (
                      <Badge text={String(t.priority)} variant={priorityVariant[String(t.priority)] || 'neutral'} size="sm" />
                    ) : null}
                  </div>
                  <p className="font-medium text-slate-900 text-sm truncate">{String(t.subject || '(No subject)')}</p>
                  <p className="text-xs text-slate-500 mt-1">{clientName}</p>
                </div>
                <p className="text-xs text-slate-400 whitespace-nowrap">
                  {t.created_at
                    ? new Date(String(t.created_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : ''}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {(!tickets || tickets.length === 0) && (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm">No tickets found</p>
          <Link href="/service/new" className="text-blue-600 text-sm font-medium mt-2 inline-block">
            Create a service ticket
          </Link>
        </div>
      )}
    </div>
  )
}
