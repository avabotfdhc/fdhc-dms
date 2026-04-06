'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AddActivityForm from '@/components/AddActivityForm'

interface Interaction {
  type?: string
  method?: string
  direction?: string
  outcome?: string
  notes?: string
  date?: string
}

interface FollowUp {
  id: string
  activity_type: string
  scheduled_at: string
  status: string
  priority: string | null
  notes: string | null
}

interface ActivityTimelineProps {
  clientId: string
}

const TYPE_ICONS: Record<string, string> = {
  'phone call': '\u260E',
  phone_call: '\u260E',
  email: '\u2709',
  sms: '\uD83D\uDCAC',
  appointment: '\uD83D\uDCC5',
  site_visit: '\uD83C\uDFE0',
  'site visit': '\uD83C\uDFE0',
  note: '\u270E',
  status_change: '\u2B06',
}

function getIcon(type: string): string {
  return TYPE_ICONS[type.toLowerCase()] || '\u25CF'
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export default function ActivityTimeline({ clientId }: ActivityTimelineProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const [clientRes, fuRes] = await Promise.all([
      supabase
        .from('clients')
        .select('interactions')
        .eq('id', clientId)
        .single(),
      supabase
        .from('scheduled_follow_ups')
        .select('id, activity_type, scheduled_at, status, priority, notes')
        .eq('client_id', clientId)
        .order('scheduled_at', { ascending: false })
        .limit(20),
    ])

    if (clientRes.data) {
      const items = Array.isArray(clientRes.data.interactions)
        ? clientRes.data.interactions
        : []
      setInteractions(items as Interaction[])
    }
    if (fuRes.data) {
      setFollowUps(fuRes.data as FollowUp[])
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Merge interactions and follow-ups into a single timeline
  type TimelineEntry =
    | { kind: 'interaction'; data: Interaction; sortDate: string }
    | { kind: 'follow_up'; data: FollowUp; sortDate: string }

  const entries: TimelineEntry[] = [
    ...interactions.map(i => ({
      kind: 'interaction' as const,
      data: i,
      sortDate: i.date || '1970-01-01',
    })),
    ...followUps.map(f => ({
      kind: 'follow_up' as const,
      data: f,
      sortDate: f.scheduled_at,
    })),
  ].sort((a, b) => (b.sortDate > a.sortDate ? 1 : -1))

  if (loading) {
    return <p className="text-sm text-slate-400 py-4">Loading timeline...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-900 text-sm">Activity Timeline</h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-sm text-blue-600 font-medium hover:text-blue-700"
        >
          + Add Activity
        </button>
      </div>

      {entries.length === 0 && (
        <p className="text-sm text-slate-400 py-4 text-center">No activity yet</p>
      )}

      <div className="space-y-0">
        {entries.map((entry, i) => {
          if (entry.kind === 'interaction') {
            const item = entry.data
            const typeName = item.type || item.method || 'Interaction'
            return (
              <div key={`i-${i}`} className="flex gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">
                  {getIcon(typeName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 capitalize">{typeName}</span>
                    {item.direction && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        item.direction === 'Inbound'
                          ? 'bg-cyan-50 text-cyan-700'
                          : 'bg-orange-50 text-orange-700'
                      }`}>
                        {item.direction}
                      </span>
                    )}
                    {item.outcome && (
                      <span className="text-xs text-slate-500">{item.outcome}</span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{item.notes}</p>
                  )}
                  {item.date && (
                    <p className="text-xs text-slate-400 mt-1">{formatDate(item.date)}</p>
                  )}
                </div>
              </div>
            )
          }

          // Follow-up entry
          const fu = entry.data
          const isPending = fu.status === 'pending'
          return (
            <div key={`fu-${fu.id}`} className="flex gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                isPending ? 'bg-amber-100' : 'bg-slate-100'
              }`}>
                {'\uD83D\uDD14'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800 capitalize">
                    {fu.activity_type.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    isPending
                      ? 'bg-amber-50 text-amber-700'
                      : fu.status === 'completed'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-slate-50 text-slate-600'
                  }`}>
                    {fu.status}
                  </span>
                  {fu.priority && (
                    <span className="text-xs text-red-500 font-medium">{fu.priority}</span>
                  )}
                </div>
                {fu.notes && (
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{fu.notes}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  Scheduled: {formatDate(fu.scheduled_at)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <AddActivityForm
          clientId={clientId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}
