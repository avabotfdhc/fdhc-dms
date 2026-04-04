'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Snapshot {
  onLot: number
  reserved: number
  incoming: number
  soldMonth: number
}

export default function InventorySnapshot() {
  const [data, setData] = useState<Snapshot>({ onLot: 0, reserved: 0, incoming: 0, soldMonth: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [onLot, reserved, incoming, sold] = await Promise.all([
        supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('status', 'on_lot'),
        supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('status', 'reserved'),
        supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('status', 'incoming'),
        supabase
          .from('inventory')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'sold')
          .gte('updated_at', monthStart),
      ])

      setData({
        onLot: onLot.count ?? 0,
        reserved: reserved.count ?? 0,
        incoming: incoming.count ?? 0,
        soldMonth: sold.count ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const items = [
    { label: 'On Lot', value: data.onLot, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Reserved', value: data.reserved, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Incoming', value: data.incoming, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Sold This Month', value: data.soldMonth, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className={`rounded-lg ${item.bg} p-3 text-center`}>
          <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
          <p className="text-xs text-slate-600 mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
