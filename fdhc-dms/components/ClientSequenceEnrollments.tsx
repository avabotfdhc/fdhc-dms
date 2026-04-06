'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Badge from '@/components/ui/Badge'

interface Enrollment {
  id: string
  sequence_id: string
  sequence_name: string
  current_step: number
  total_steps: number
  status: string
  enrolled_at: string
}

interface AvailableSequence {
  id: string
  name: string
}

interface ClientSequenceEnrollmentsProps {
  clientId: string
}

export default function ClientSequenceEnrollments({ clientId }: ClientSequenceEnrollmentsProps) {
  const supabase = createClient()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [availableSequences, setAvailableSequences] = useState<AvailableSequence[]>([])
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const loadEnrollments = useCallback(async () => {
    const { data: enrollmentData } = await supabase
      .from('sequence_enrollments')
      .select('id, sequence_id, current_step, status, enrolled_at')
      .eq('client_id', clientId)
      .in('status', ['active', 'paused'])

    if (enrollmentData) {
      const enriched = await Promise.all(
        enrollmentData.map(async (e) => {
          const [seqResult, stepCountResult] = await Promise.all([
            supabase.from('follow_up_sequences').select('name').eq('id', e.sequence_id).single(),
            supabase
              .from('sequence_steps')
              .select('*', { count: 'exact', head: true })
              .eq('sequence_id', e.sequence_id),
          ])
          return {
            ...e,
            sequence_name: seqResult.data?.name || 'Unknown Sequence',
            total_steps: stepCountResult.count || 0,
          }
        })
      )
      setEnrollments(enriched)
    }

    const { data: sequences } = await supabase
      .from('follow_up_sequences')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    if (sequences) setAvailableSequences(sequences)

    setLoading(false)
  }, [supabase, clientId])

  useEffect(() => {
    loadEnrollments()
  }, [loadEnrollments])

  async function handleEnroll(sequenceId: string) {
    setShowDropdown(false)
    await supabase.from('sequence_enrollments').insert({
      client_id: clientId,
      sequence_id: sequenceId,
      current_step: 1,
      status: 'active',
    })
    await loadEnrollments()
  }

  async function handleAction(enrollmentId: string, action: 'pause' | 'resume' | 'cancel') {
    const newStatus = action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'cancelled'
    setEnrollments(prev =>
      action === 'cancel'
        ? prev.filter(e => e.id !== enrollmentId)
        : prev.map(e => (e.id === enrollmentId ? { ...e, status: newStatus } : e))
    )
    await supabase
      .from('sequence_enrollments')
      .update({ status: newStatus })
      .eq('id', enrollmentId)
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'success' as const
      case 'paused':
        return 'warning' as const
      default:
        return 'neutral' as const
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <div className="animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-40 mb-3" />
          <div className="h-16 bg-slate-100 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-4 overflow-hidden">
      {/* Header - collapsible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-900 text-sm">Active Sequences</h2>
          {enrollments.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              {enrollments.length}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="p-5">
          {enrollments.length === 0 ? (
            <p className="text-sm text-slate-400 mb-3">No active sequence enrollments</p>
          ) : (
            <div className="space-y-3 mb-4">
              {enrollments.map(e => {
                const progress = e.total_steps > 0 ? (e.current_step / e.total_steps) * 100 : 0

                return (
                  <div
                    key={e.id}
                    className="border border-slate-100 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">
                          {e.sequence_name}
                        </span>
                        <Badge text={e.status} variant={statusBadge(e.status)} size="sm" />
                      </div>
                      <span className="text-xs text-slate-400">
                        Step {e.current_step} of {e.total_steps}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {e.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleAction(e.id, 'pause')}
                          className="px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 rounded hover:bg-amber-100 transition-colors"
                        >
                          Pause
                        </button>
                      )}
                      {e.status === 'paused' && (
                        <button
                          type="button"
                          onClick={() => handleAction(e.id, 'resume')}
                          className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          Resume
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAction(e.id, 'cancel')}
                        className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Enroll button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors"
            >
              + Enroll in Sequence
            </button>

            {showDropdown && (
              <div className="absolute top-8 left-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[220px] py-1">
                {availableSequences.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-400">No active sequences available</p>
                ) : (
                  availableSequences.map(seq => (
                    <button
                      key={seq.id}
                      type="button"
                      onClick={() => handleEnroll(seq.id)}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      {seq.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
