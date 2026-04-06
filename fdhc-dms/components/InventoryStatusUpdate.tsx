'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const STATUSES = [
  { value: 'factory_order', label: 'Factory Order', color: 'bg-purple-100 text-purple-800' },
  { value: 'in_production', label: 'In Production', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'in_transit', label: 'In Transit', color: 'bg-sky-100 text-sky-800' },
  { value: 'on_lot', label: 'On Lot', color: 'bg-teal-100 text-teal-800' },
  { value: 'available', label: 'Available', color: 'bg-green-100 text-green-800' },
  { value: 'reserved', label: 'Reserved', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'sold', label: 'Sold', color: 'bg-orange-100 text-orange-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-blue-100 text-blue-800' },
]

interface InventoryStatusUpdateProps {
  inventoryId: string
  currentStatus: string
}

export default function InventoryStatusUpdate({ inventoryId, currentStatus }: InventoryStatusUpdateProps) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)

  const current = STATUSES.find(s => s.value === status) || STATUSES[0]

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value
    setStatus(newStatus)
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.from('inventory').update({ status: newStatus }).eq('id', inventoryId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${current.color}`}>
        {current.label}
      </span>
      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
      >
        {STATUSES.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      {saving && <span className="text-xs text-amber-600 animate-pulse">...</span>}
    </div>
  )
}
