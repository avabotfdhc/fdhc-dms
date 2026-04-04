'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Deal {
  id: string
  deal_number: string
  status: string
  total_price: number | null
  clients?: { first_name: string; last_name: string } | null
}

export default function MyDeals() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('agreements')
        .select('id, deal_number, status, total_price, clients(first_name, last_name)')
        .eq('salesperson_id', user.id)
        .in('status', ['active', 'pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(8)

      setDeals((data as unknown as Deal[]) ?? [])
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

  if (deals.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No active deals assigned to you.
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-50">
      {deals.map((deal) => {
        const client = deal.clients
        const name = client ? `${client.first_name} ${client.last_name}` : 'Unknown'
        const amount = deal.total_price != null
          ? `$${deal.total_price.toLocaleString()}`
          : '--'

        return (
          <Link
            key={deal.id}
            href={`/deals/${deal.id}`}
            className="flex items-center gap-3 py-2.5 hover:bg-slate-50 -mx-1 px-1 rounded transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">
                #{deal.deal_number} &middot; {name}
              </p>
              <p className="text-xs text-slate-500">{amount}</p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 capitalize">
              {deal.status}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
