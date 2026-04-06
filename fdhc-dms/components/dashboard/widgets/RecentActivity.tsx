'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AuditEntry {
  table_name: string
  action: string
  changed_at: string
  actor: string | null
}

export default function RecentActivity() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('audit_log')
        .select('table_name, action, changed_at, actor')
        .order('changed_at', { ascending: false })
        .limit(10)

      setEntries((data as AuditEntry[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No recent activity.
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-50">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-start gap-3 py-2.5">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-700">
              <span className="font-medium capitalize">{entry.action}</span>{' '}
              <span className="text-slate-500">{entry.table_name}</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {entry.actor || 'System'} &middot;{' '}
              {new Date(entry.changed_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
