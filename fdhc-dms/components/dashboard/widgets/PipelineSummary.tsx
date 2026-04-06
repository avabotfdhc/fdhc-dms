'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const STATUSES = ['new', 'connected', 'qualified', 'appointment', 'working', 'sold'] as const
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-slate-400',
  connected: 'bg-blue-400',
  qualified: 'bg-indigo-500',
  appointment: 'bg-purple-500',
  working: 'bg-amber-500',
  sold: 'bg-emerald-500',
}

export default function PipelineSummary() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const results: Record<string, number> = {}

      const promises = STATUSES.map(async (status) => {
        const { count } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('status', status)
        results[status] = count ?? 0
      })

      await Promise.all(promises)
      setCounts(results)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-6 rounded bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  const max = Math.max(...Object.values(counts), 1)

  return (
    <div className="space-y-2.5">
      {STATUSES.map((status) => {
        const count = counts[status] ?? 0
        const pct = Math.round((count / max) * 100)

        return (
          <div key={status}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600 capitalize">{status}</span>
              <span className="text-xs text-slate-500">{count}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${STATUS_COLORS[status]} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
