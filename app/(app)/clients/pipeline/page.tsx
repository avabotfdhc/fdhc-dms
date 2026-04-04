import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PipelineBoard from '@/components/PipelineBoard'
import type { PipelineClientData } from '@/components/PipelineCard'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: rawClients } = await supabase
    .from('clients')
    .select('id, first_name, last_name, phone, assigned_to, status, created_at, next_follow_up_at')
    .order('created_at', { ascending: false })
    .limit(500)

  // Fetch rep initials for assigned clients
  const assignedIds = [...new Set((rawClients || []).map(c => c.assigned_to).filter(Boolean))]
  let repMap: Record<string, string> = {}
  if (assignedIds.length > 0) {
    const { data: reps } = await supabase
      .from('profiles')
      .select('id, name, username')
      .in('id', assignedIds)
    if (reps) {
      for (const r of reps) {
        const displayName = r.name || r.username || ''
        const parts = displayName.split(' ')
        repMap[r.id] = parts.length > 1
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : displayName.slice(0, 2).toUpperCase()
      }
    }
  }

  const clients: PipelineClientData[] = (rawClients || []).map(c => ({
    id: c.id,
    first_name: c.first_name || '',
    last_name: c.last_name || '',
    phone: c.phone,
    assigned_to: c.assigned_to,
    assigned_initials: c.assigned_to ? repMap[c.assigned_to] || '' : '',
    status: c.status || 'new',
    created_at: c.created_at,
    next_follow_up_at: c.next_follow_up_at,
  }))

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Pipeline</h1>
          <p className="text-slate-500 text-sm">{clients.length} total clients</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/clients"
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
          >
            List View
          </Link>
          <Link
            href="/clients/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New
          </Link>
        </div>
      </div>

      <PipelineBoard initialClients={clients} />
    </div>
  )
}
