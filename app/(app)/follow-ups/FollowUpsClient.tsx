'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import FollowUpCompleteModal from '@/components/FollowUpCompleteModal'

interface FollowUpRow {
  id: string
  client_id: string
  assigned_to: string
  activity_type: string
  scheduled_at: string
  status: string
  priority: string | null
  notes: string | null
}

interface ClientBasic {
  id: string
  first_name: string
  last_name: string
}

interface Groups {
  overdue: FollowUpRow[]
  today: FollowUpRow[]
  tomorrow: FollowUpRow[]
  later: FollowUpRow[]
}

interface Props {
  groups: Groups
  clientMap: Record<string, ClientBasic>
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function FollowUpsClient({ groups: initialGroups, clientMap }: Props) {
  const [groups, setGroups] = useState(initialGroups)
  const [completing, setCompleting] = useState<FollowUpRow | null>(null)

  async function handleSkip(fuId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('scheduled_follow_ups')
      .update({ status: 'skipped' })
      .eq('id', fuId)

    if (!error) {
      // Remove from all groups
      setGroups(prev => ({
        overdue: prev.overdue.filter(f => f.id !== fuId),
        today: prev.today.filter(f => f.id !== fuId),
        tomorrow: prev.tomorrow.filter(f => f.id !== fuId),
        later: prev.later.filter(f => f.id !== fuId),
      }))
    }
  }

  function handleCompleted() {
    if (!completing) return
    const fuId = completing.id
    setGroups(prev => ({
      overdue: prev.overdue.filter(f => f.id !== fuId),
      today: prev.today.filter(f => f.id !== fuId),
      tomorrow: prev.tomorrow.filter(f => f.id !== fuId),
      later: prev.later.filter(f => f.id !== fuId),
    }))
    setCompleting(null)
  }

  function renderSection(
    label: string,
    items: FollowUpRow[],
    isOverdue: boolean = false,
    showDate: boolean = false,
  ) {
    if (items.length === 0) return null

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className={`text-sm font-semibold uppercase tracking-wide ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
            {label}
          </h2>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
            {items.length}
          </span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          {items.map(fu => {
            const client = clientMap[fu.client_id]
            const clientName = client
              ? `${client.first_name} ${client.last_name}`
              : 'Unknown Client'

            return (
              <div
                key={fu.id}
                className={`px-4 py-3 flex items-center gap-3 ${isOverdue ? 'bg-red-50/50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/clients/${fu.client_id}`}
                      className="text-sm font-medium text-slate-900 hover:text-blue-600"
                    >
                      {clientName}
                    </Link>
                    {fu.priority && (
                      <span className="text-xs text-red-500 font-medium">{fu.priority}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 capitalize">
                      {fu.activity_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      {showDate ? formatDate(fu.scheduled_at) : formatTime(fu.scheduled_at)}
                    </span>
                  </div>
                  {fu.notes && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{fu.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setCompleting(fu)}
                    className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSkip(fu.id)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const total = groups.overdue.length + groups.today.length + groups.tomorrow.length + groups.later.length

  return (
    <>
      {total === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
          <p className="text-slate-400 text-sm">All caught up! No pending follow-ups.</p>
        </div>
      )}

      {renderSection('Overdue', groups.overdue, true, true)}
      {renderSection('Today', groups.today, false, false)}
      {renderSection('Tomorrow', groups.tomorrow, false, false)}
      {renderSection('Later', groups.later, false, true)}

      {completing && (
        <FollowUpCompleteModal
          followUpId={completing.id}
          clientId={completing.client_id}
          clientName={
            clientMap[completing.client_id]
              ? `${clientMap[completing.client_id].first_name} ${clientMap[completing.client_id].last_name}`
              : 'Client'
          }
          activityType={completing.activity_type}
          assignedTo={completing.assigned_to}
          onClose={() => setCompleting(null)}
          onCompleted={handleCompleted}
        />
      )}
    </>
  )
}
