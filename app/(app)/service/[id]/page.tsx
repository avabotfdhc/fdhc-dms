import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import ServiceTicketClient from './ServiceTicketClient'

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

export default async function ServiceTicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from('service_tickets')
    .select('*, clients(id, first_name, last_name, email, phone), agreements(id, deal_number)')
    .eq('id', params.id)
    .single()

  if (!ticket) notFound()

  const client = ticket.clients as Record<string, string> | null
  const deal = ticket.agreements as Record<string, string | number> | null
  const ticketData = (ticket.data as Record<string, unknown>) || {}

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/service" className="text-slate-400 hover:text-slate-600 text-sm">&larr; Service</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700 font-mono">#{String(ticket.id).slice(0, 8)}</span>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{ticket.subject || '(No subject)'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge text={ticket.status || 'open'} variant={statusVariant[ticket.status] || 'neutral'} />
            {ticket.priority ? (
              <Badge text={String(ticket.priority)} variant={priorityVariant[String(ticket.priority)] || 'neutral'} />
            ) : null}
            {ticketData.category ? (
              <Badge text={String(ticketData.category)} variant="neutral" />
            ) : null}
          </div>
        </div>
      </div>

      {/* Client & Deal links */}
      <div className="flex flex-wrap gap-3 mb-4">
        {client && (
          <Link
            href={`/clients/${client.id}`}
            className="inline-flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <span>👤</span>
            {client.first_name} {client.last_name}
          </Link>
        )}
        {deal && (
          <Link
            href={`/agreements/${deal.id}`}
            className="inline-flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <span>📋</span>
            Deal #{deal.deal_number}
          </Link>
        )}
      </div>

      {/* Description */}
      {ticketData.description ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Description</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{String(ticketData.description)}</p>
        </div>
      ) : null}

      {/* Status updates + notes (client component) */}
      <ServiceTicketClient ticketId={ticket.id} initialStatus={ticket.status || 'open'} initialData={ticketData} />
    </div>
  )
}
