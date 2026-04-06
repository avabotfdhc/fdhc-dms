'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FollowUp {
  id: string
  client_id: string
  activity_type: string
  scheduled_date: string
  status: string
  clients?: { first_name: string; last_name: string } | null
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

  async function handleComplete(id: string) {
    const supabase = createClient()
    await supabase.from('follow_ups').update({ status: 'completed' }).eq('id', id)
    setFollowUps((prev) => prev.filter((f) => f.id !== id))
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (followUps.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No follow-ups due today. You are all caught up!
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-50">
      {followUps.map((fu) => {
        const client = fu.clients
        const name = client ? `${client.first_name} ${client.last_name}` : 'Unknown'
        const time = new Date(fu.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        return (
          <div key={fu.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
              <p className="text-xs text-slate-500">
                {fu.activity_type} &middot; {time}
              </p>
            </div>
            <button
              onClick={() => handleComplete(fu.id)}
              className="shrink-0 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              Complete
            </button>
          </div>
        )
      })}
    </div>
  )
}
