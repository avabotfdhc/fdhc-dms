'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface FollowUp {
  id: string
  client_id: string
  activity_type: string
  scheduled_date: string
  status: string
  clients?: { first_name: string; last_name: string } | null
}

const typeColors: Record<string, string> = {
  call:  'bg-blue-50 text-blue-700',
  email: 'bg-purple-50 text-purple-700',
  text:  'bg-green-50 text-green-700',
  visit: 'bg-amber-50 text-amber-700',
}

export default function MyFollowUps() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('follow_ups')
        .select('id, client_id, activity_type, scheduled_date, status, clients(first_name, last_name)')
        .eq('status', 'pending')
        .eq('assigned_to', user.id)
        .lte('scheduled_date', today + 'T23:59:59')
        .order('scheduled_date', { ascending: true })
        .limit(10)
      setFollowUps((data as unknown as FollowUp[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleComplete(id: string, e: React.MouseEvent) {
    e.preventDefault()
    const supabase = createClient()
    await supabase.from('follow_ups').update({ status: 'completed' }).eq('id', id)
    setFollowUps(prev => prev.filter(f => f.id !== id))
  }

  if (loading) {
    return <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}</div>
  }

  if (followUps.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-2xl mb-2">✅</p>
        <p className="text-sm font-medium text-slate-600">All caught up!</p>
        <p className="text-xs text-slate-400 mt-0.5">No follow-ups due today</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-50 -mx-1">
      {followUps.map(fu => {
        const client = fu.clients
        const name = client ? `${client.first_name} ${client.last_name}` : 'Unknown'
        const time = new Date(fu.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const typeClass = typeColors[fu.activity_type?.toLowerCase()] ?? 'bg-slate-100 text-slate-600'

        return (
          <Link
            key={fu.id}
            href={`/clients/${fu.client_id}`}
            className="flex items-center gap-3 px-1 py-3 hover:bg-slate-50 rounded-lg transition-colors group"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{time}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeClass}`}>
              {fu.activity_type}
            </span>
            <button
              onClick={e => handleComplete(fu.id, e)}
              className="shrink-0 rounded-lg bg-emerald-500 text-white px-2.5 py-1 text-xs font-semibold hover:bg-emerald-600 transition-colors shadow-sm"
            >
              Done
            </button>
          </Link>
        )
      })}
    </div>
  )
}
