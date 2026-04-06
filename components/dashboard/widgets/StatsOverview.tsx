'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
        supabase.from('follow_ups').select('*', { count: 'exact', head: true })
          .eq('status', 'pending').lte('scheduled_date', today + 'T23:59:59'),
      ])
      setStats({ clients: clients.count ?? 0, deals: deals.count ?? 0, models: models.count ?? 0, followUps: followUps.count ?? 0 })
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Total Clients',   value: stats.clients,   icon: '👥', href: '/clients',    iconBg: 'bg-blue-500',    bg: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-700' },
    { label: 'Active Deals',    value: stats.deals,     icon: '📋', href: '/agreements', iconBg: 'bg-emerald-500', bg: 'bg-emerald-50',border: 'border-emerald-100',text: 'text-emerald-700' },
    { label: 'Models on Lot',   value: stats.models,    icon: '🏠', href: '/inventory',  iconBg: 'bg-purple-500',  bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700' },
    { label: 'Follow-ups Due',  value: stats.followUps, icon: '🔔', href: '/follow-ups', iconBg: stats.followUps > 0 ? 'bg-amber-500' : 'bg-slate-400', bg: stats.followUps > 0 ? 'bg-amber-50' : 'bg-slate-50', border: stats.followUps > 0 ? 'border-amber-100' : 'border-slate-100', text: stats.followUps > 0 ? 'text-amber-700' : 'text-slate-600' },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => (
        <Link key={card.label} href={card.href}
          className={`group flex flex-col gap-3 rounded-xl border ${card.border} ${card.bg} p-4 hover:shadow-md transition-all hover:-translate-y-0.5`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-9 h-9 ${card.iconBg} rounded-lg flex items-center justify-center text-base text-white shadow-sm`}>
              {card.icon}
            </div>
            <span className={`text-xs font-medium ${card.text} opacity-0 group-hover:opacity-100 transition-opacity`}>View →</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{card.value.toLocaleString()}</p>
            <p className={`text-xs font-semibold mt-1 ${card.text}`}>{card.label}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
