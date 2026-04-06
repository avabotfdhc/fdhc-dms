'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Badge from '@/components/ui/Badge'

interface Sequence {
  id: string
  name: string
  description: string | null
  trigger_type: string | null
  is_active: boolean
  step_count?: number
}

export default function SequencesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('follow_up_sequences')
        .select('id, name, description, trigger_type, is_active')
        .order('created_at', { ascending: false })

      if (data) {
        // Fetch step counts
        const withCounts = await Promise.all(
          data.map(async (seq) => {
            const { count } = await supabase
              .from('sequence_steps')
              .select('*', { count: 'exact', head: true })
              .eq('sequence_id', seq.id)
            return { ...seq, step_count: count || 0 }
          })
        )
        setSequences(withCounts)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  async function toggleActive(seq: Sequence) {
    const newActive = !seq.is_active
    setSequences(prev =>
      prev.map(s => (s.id === seq.id ? { ...s, is_active: newActive } : s))
    )
    await supabase
      .from('follow_up_sequences')
      .update({ is_active: newActive })
      .eq('id', seq.id)
  }

  async function handleCreate() {
    const { data, error } = await supabase
      .from('follow_up_sequences')
      .insert({ name: 'New Sequence', is_active: false })
      .select('id')
      .single()

    if (data && !error) {
      router.push(`/settings/sequences/${data.id}`)
    }
  }

  const triggerBadgeVariant = (type: string | null) => {
    switch (type) {
      case 'new_lead':
        return 'info' as const
      case 'status_change':
        return 'purple' as const
      case 'manual':
        return 'neutral' as const
      default:
        return 'neutral' as const
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-slate-400 hover:text-slate-600 text-sm">
          &larr; Settings
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">Sequences</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Follow-up Sequences</h1>
          <p className="text-slate-500 text-sm">{sequences.length} sequences</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Create Sequence
        </button>
      </div>

      <div className="space-y-3">
        {sequences.map(seq => (
          <div
            key={seq.id}
            onClick={() => router.push(`/settings/sequences/${seq.id}`)}
            className={`bg-white rounded-xl shadow-sm border p-4 transition-all cursor-pointer hover:shadow-md ${
              seq.is_active ? 'border-slate-100' : 'border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {seq.name}
                  </h3>
                  {seq.trigger_type && (
                    <Badge
                      text={seq.trigger_type.replace(/_/g, ' ')}
                      variant={triggerBadgeVariant(seq.trigger_type)}
                      size="sm"
                    />
                  )}
                </div>
                {seq.description && (
                  <p className="text-sm text-slate-500 truncate">{seq.description}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {seq.step_count} {seq.step_count === 1 ? 'step' : 'steps'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    toggleActive(seq)
                  }}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    seq.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      seq.is_active ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sequences.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm">No sequences yet</p>
          <button onClick={handleCreate} className="text-blue-600 text-sm font-medium mt-2">
            Create your first sequence
          </button>
        </div>
      )}
    </div>
  )
}
