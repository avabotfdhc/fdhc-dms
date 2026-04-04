'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UpgradeItem {
  id: string
  data: {
    name: string
    category: string
    cost: number
    price: number
  }
}

interface SelectedUpgrade {
  id: string
  name: string
  category: string
  price: number
  cost: number
  custom?: boolean
}

interface StepUpgradesProps {
  selectedUpgrades: SelectedUpgrade[]
  onChange: (upgrades: SelectedUpgrade[]) => void
}

export default function StepUpgrades({ selectedUpgrades, onChange }: StepUpgradesProps) {
  const [upgrades, setUpgrades] = useState<UpgradeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('upgrades')
        .select('id, data')
        .order('created_at')
      setUpgrades((data as UpgradeItem[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const selectedIds = new Set(selectedUpgrades.filter(u => !u.custom).map(u => u.id))

  function toggle(item: UpgradeItem) {
    if (selectedIds.has(item.id)) {
      onChange(selectedUpgrades.filter(u => u.id !== item.id))
    } else {
      onChange([
        ...selectedUpgrades,
        {
          id: item.id,
          name: item.data.name,
          category: item.data.category,
          price: item.data.price,
          cost: item.data.cost,
        },
      ])
    }
  }

  function addCustom() {
    if (!customName || !customPrice) return
    const price = parseFloat(customPrice)
    if (isNaN(price)) return
    onChange([
      ...selectedUpgrades,
      {
        id: `custom-${Date.now()}`,
        name: customName,
        category: 'Custom',
        price,
        cost: price,
        custom: true,
      },
    ])
    setCustomName('')
    setCustomPrice('')
    setShowCustom(false)
  }

  function removeCustom(id: string) {
    onChange(selectedUpgrades.filter(u => u.id !== id))
  }

  const total = selectedUpgrades.reduce((sum, u) => sum + u.price, 0)
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  // Group upgrades by category
  const byCategory: Record<string, UpgradeItem[]> = {}
  for (const u of upgrades) {
    const cat = u.data.category || 'Other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(u)
  }

  if (loading) {
    return <p className="text-sm text-slate-400 text-center py-8">Loading upgrades...</p>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Options &amp; Upgrades</h2>

      {Object.entries(byCategory).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            {category}
          </h3>
          <div className="space-y-2">
            {items.map(item => {
              const checked = selectedIds.has(item.id)
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    checked
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 text-sm text-slate-900">{item.data.name}</span>
                  <span className="text-sm font-semibold text-slate-700">{fmt(item.data.price)}</span>
                </label>
              )
            })}
          </div>
        </div>
      ))}

      {/* Custom upgrades */}
      {selectedUpgrades.filter(u => u.custom).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Custom Items
          </h3>
          <div className="space-y-2">
            {selectedUpgrades
              .filter(u => u.custom)
              .map(u => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-3"
                >
                  <span className="flex-1 text-sm text-slate-900">{u.name}</span>
                  <span className="text-sm font-semibold text-slate-700">{fmt(u.price)}</span>
                  <button
                    type="button"
                    onClick={() => removeCustom(u.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Add custom form */}
      {showCustom ? (
        <div className="rounded-lg border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Add Custom Upgrade</p>
          <input
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder="Item name"
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <input
            type="number"
            value={customPrice}
            onChange={e => setCustomPrice(e.target.value)}
            placeholder="Price"
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addCustom}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowCustom(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Custom Upgrade
        </button>
      )}

      {/* Running total */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          {selectedUpgrades.length} upgrade{selectedUpgrades.length !== 1 ? 's' : ''} selected
        </span>
        <span className="text-lg font-bold text-slate-900">{fmt(total)}</span>
      </div>
    </div>
  )
}
