'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface ClientRow {
  id: string
  first_name: string
  last_name: string
  last_contact_date: string | null
  next_follow_up: string | null
}

export default function MyClients() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name, last_contact_date, next_follow_up')
        .eq('assigned_to', user.id)
        .or(`last_contact_date.is.null,last_contact_date.lt.${sevenDaysAgo.toISOString()}`)
        .order('last_contact_date', { ascending: true, nullsFirst: true })
        .limit(8)

      setClients((data as ClientRow[]) ?? [])
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

  if (clients.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        All your clients have been contacted recently.
      </div>
    )
  }

  function daysSince(dateStr: string | null): string {
    if (!dateStr) return 'Never'
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
    return `${days}d ago`
  }

  return (
    <div className="divide-y divide-slate-50">
      {clients.map((c) => (
        <Link
          key={c.id}
          href={`/clients/${c.id}`}
          className="flex items-center gap-3 py-2.5 hover:bg-slate-50 -mx-1 px-1 rounded transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">
              {c.first_name} {c.last_name}
            </p>
            <p className="text-xs text-slate-500">
              Last contact: {daysSince(c.last_contact_date)}
              {c.next_follow_up && (
                <> &middot; Next: {new Date(c.next_follow_up).toLocaleDateString()}</>
              )}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
            Needs attention
          </span>
        </Link>
      ))}
    </div>
  )
}
