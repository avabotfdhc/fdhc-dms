'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RepStats {
  name: string
  deals: number
  revenue: number
}

export default function TeamLeaderboard() {
  const [rows, setRows] = useState<RepStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: agreements } = await supabase
        .from('agreements')
        .select('salesperson_id, total_price, profiles(full_name)')
        .in('status', ['active', 'completed', 'sold'])

      if (!agreements) { setLoading(false); return }

      const map = new Map<string, { name: string; deals: number; revenue: number }>()

      for (const a of agreements) {
        const id = a.salesperson_id as string
        const profile = a.profiles as unknown as { full_name: string } | null
        const existing = map.get(id)
        if (existing) {
          existing.deals += 1
          existing.revenue += (a.total_price as number) ?? 0
        } else {
          map.set(id, {
            name: profile?.full_name ?? 'Unknown',
            deals: 1,
            revenue: (a.total_price as number) ?? 0,
          })
        }
      }

      const sorted = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
      setRows(sorted.slice(0, 10))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 rounded bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No sales data available yet.
      </div>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-500 border-b border-slate-100">
          <th className="text-left py-2 font-medium">#</th>
          <th className="text-left py-2 font-medium">Rep</th>
          <th className="text-right py-2 font-medium">Deals</th>
          <th className="text-right py-2 font-medium">Revenue</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-50">
            <td className="py-2 text-slate-400 font-medium">{i + 1}</td>
            <td className="py-2 text-slate-800 font-medium truncate max-w-[120px]">{r.name}</td>
            <td className="py-2 text-right text-slate-600">{r.deals}</td>
            <td className="py-2 text-right text-slate-600">${r.revenue.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
