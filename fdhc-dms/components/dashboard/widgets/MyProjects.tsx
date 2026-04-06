'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Project {
  id: string
  deal_number: string
  percent_complete: number
  clients?: { first_name: string; last_name: string } | null
}

export default function MyProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('delivery_projects')
        .select('id, deal_number, percent_complete, clients(first_name, last_name)')
        .eq('assigned_to', user.id)
        .in('status', ['active', 'in_progress'])
        .order('updated_at', { ascending: false })
        .limit(8)

      setProjects((data as unknown as Project[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No active delivery projects.
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-50">
      {projects.map((p) => {
        const client = p.clients
        const name = client ? `${client.first_name} ${client.last_name}` : 'Unknown'
        const pct = p.percent_complete ?? 0

        return (
          <Link
            key={p.id}
            href={`/deals/${p.id}`}
            className="block py-2.5 hover:bg-slate-50 -mx-1 px-1 rounded transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-slate-800 truncate">
                #{p.deal_number} &middot; {name}
              </p>
              <span className="text-xs font-medium text-slate-600 shrink-0 ml-2">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full bg-blue-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
