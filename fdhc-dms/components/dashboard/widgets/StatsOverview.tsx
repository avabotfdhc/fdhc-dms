'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  clients: number
  deals: number
  models: number
  followUps: number
}

export default function StatsOverview() {
  const [stats, setStats] = useState<Stats>({ clients: 0, deals: 0, models: 0, followUps: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      const [clients, deals, models, followUps] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('agreements').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('models').select('*', { count: 'exact', head: true }),
        supabase
          .from('follow_ups')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .lte('scheduled_date', today + 'T23:59:59'),
      ])

      setStats({
        clients: clients.count ?? 0,
        deals: deals.count ?? 0,
        models: models.count ?? 0,
        followUps: followUps.count ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Total Clients', value: stats.clients, icon: '👥', color: 'bg-blue-500' },
    { label: 'Active Deals', value: stats.deals, icon: '📋', color: 'bg-emerald-500' },
    { label: 'Models', value: stats.models, icon: '🏠', color: 'bg-purple-500' },
    { label: 'Follow-ups Due', value: stats.followUps, icon: '📞', color: 'bg-amber-500' },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-slate-100 bg-white p-3">
          <div
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm ${card.color} text-white mb-2`}
          >
            {card.icon}
          </div>
          <p className="text-xl font-bold text-slate-900">{card.value.toLocaleString()}</p>
          <p className="text-xs text-slate-500">{card.label}</p>
        </div>
      ))}
    </div>
  )
}
