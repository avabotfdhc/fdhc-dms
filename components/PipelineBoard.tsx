'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { processActivityOutcome } from '@/lib/automation-engine'
import PipelineCard, { type PipelineClientData } from '@/components/PipelineCard'

const PIPELINE_STATUSES = [
  { key: 'new', label: 'New', color: 'bg-blue-500' },
  { key: 'connected', label: 'Connected', color: 'bg-cyan-500' },
  { key: 'qualified', label: 'Qualified', color: 'bg-violet-500' },
  { key: 'appointment', label: 'Appointment', color: 'bg-amber-500' },
  { key: 'working', label: 'Working', color: 'bg-orange-500' },
  { key: 'sold', label: 'Sold', color: 'bg-green-500' },
  { key: 'lost', label: 'Lost', color: 'bg-slate-400' },
] as const

// Map old statuses to pipeline columns
function getColumnKey(status: string): string {
  const map: Record<string, string> = {
    lead: 'new',
    active: 'working',
    closed: 'sold',
  }
  return map[status] || status
}

interface PipelineBoardProps {
  initialClients: PipelineClientData[]
}

export default function PipelineBoard({ initialClients }: PipelineBoardProps) {
  const [clients, setClients] = useState<PipelineClientData[]>(initialClients)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const grouped: Record<string, PipelineClientData[]> = {}
  for (const col of PIPELINE_STATUSES) {
    grouped[col.key] = []
  }
  for (const c of clients) {
    const key = getColumnKey(c.status)
    if (grouped[key]) {
      grouped[key].push(c)
    } else {
      // Fallback: put into "new" if status doesn't match
      grouped['new']?.push(c)
    }
  }

  const handleDragStart = useCallback((e: React.DragEvent, clientId: string) => {
    e.dataTransfer.setData('text/plain', clientId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(status)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDragOver(null)
    const clientId = e.dataTransfer.getData('text/plain')
    if (!clientId) return

    const target = clients.find(c => c.id === clientId)
    if (!target || getColumnKey(target.status) === newStatus) return

    // Optimistic update
    setClients(prev =>
      prev.map(c => (c.id === clientId ? { ...c, status: newStatus } : c)),
    )

    // Persist to Supabase
    const supabase = createClient()
    const { error } = await supabase
      .from('clients')
      .update({ status: newStatus })
      .eq('id', clientId)

    if (error) {
      // Revert on error
      setClients(prev =>
        prev.map(c => (c.id === clientId ? { ...c, status: target.status } : c)),
      )
      return
    }

    // Log activity and trigger automation (non-fatal)
    try {
      // Append status change to interactions
      const { data: freshClient } = await supabase
        .from('clients')
        .select('interactions, assigned_to')
        .eq('id', clientId)
        .single()

      if (freshClient) {
        const interactions: Record<string, unknown>[] = Array.isArray(freshClient.interactions)
          ? freshClient.interactions
          : []
        interactions.push({
          type: 'status_change',
          notes: `Moved from ${target.status} to ${newStatus}`,
          date: new Date().toISOString(),
        })
        await supabase
          .from('clients')
          .update({ interactions })
          .eq('id', clientId)

        await processActivityOutcome(supabase, {
          clientId,
          activityType: 'status_change',
          outcome: newStatus,
          assignedTo: freshClient.assigned_to || '',
        })
      }
    } catch {
      // Non-fatal
    }
  }, [clients])

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
      {PIPELINE_STATUSES.map(col => {
        const items = grouped[col.key] || []
        return (
          <div
            key={col.key}
            onDragOver={e => handleDragOver(e, col.key)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, col.key)}
            className={`flex-shrink-0 w-56 md:w-auto md:flex-1 bg-slate-50 rounded-xl p-2 transition-colors ${
              dragOver === col.key ? 'bg-blue-50 ring-2 ring-blue-200' : ''
            }`}
          >
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
              <span className={`w-2 h-2 rounded-full ${col.color}`} />
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                {col.label}
              </span>
              <span className="text-xs text-slate-400 ml-auto">{items.length}</span>
            </div>
            <div className="space-y-2 min-h-[100px]">
              {items.map(c => (
                <PipelineCard
                  key={c.id}
                  client={c}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
