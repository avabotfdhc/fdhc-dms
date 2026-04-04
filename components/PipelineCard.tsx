'use client'

import Link from 'next/link'

export interface PipelineClientData {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  assigned_to: string | null
  assigned_initials?: string
  status: string
  created_at: string
  next_follow_up_at: string | null
}

interface PipelineCardProps {
  client: PipelineClientData
  onDragStart: (e: React.DragEvent, clientId: string) => void
}

function daysInStage(createdAt: string): number {
  const diff = Date.now() - new Date(createdAt).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function hasUpcomingFollowUp(nextFollowUp: string | null): boolean {
  if (!nextFollowUp) return false
  const diff = new Date(nextFollowUp).getTime() - Date.now()
  return diff > 0 && diff < 1000 * 60 * 60 * 24 // within 24h
}

export default function PipelineCard({ client, onDragStart }: PipelineCardProps) {
  const days = daysInStage(client.created_at)
  const upcoming = hasUpcomingFollowUp(client.next_follow_up_at)

  return (
    <Link href={`/clients/${client.id}`}>
      <div
        draggable
        onDragStart={e => onDragStart(e, client.id)}
        className="bg-white rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-slate-900 leading-tight">
            {client.first_name} {client.last_name}
          </p>
          {client.assigned_initials && (
            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {client.assigned_initials}
            </span>
          )}
        </div>
        {client.phone && (
          <p className="text-xs text-slate-500 mt-0.5">{client.phone}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-slate-400">{days}d</span>
          {upcoming && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title="Follow-up soon" />
          )}
        </div>
      </div>
    </Link>
  )
}
