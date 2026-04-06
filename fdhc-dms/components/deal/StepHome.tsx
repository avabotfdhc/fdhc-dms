'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Model {
  id: string
  name: string
  manufacturer: string
  base_price: number
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  width: string | null
  length: string | null
  sections: number | null
}

interface StepHomeProps {
  selectedModelId: string | null
  onSelect: (model: Model) => void
}

export default function StepHome({ selectedModelId, onSelect }: StepHomeProps) {
  const [models, setModels] = useState<Model[]>([])
  const [filtered, setFiltered] = useState<Model[]>([])
  const [selected, setSelected] = useState<Model | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMfg, setFilterMfg] = useState('')
  const [filterBed, setFilterBed] = useState('')
  const [filterPrice, setFilterPrice] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('models')
        .select('id, name, manufacturer, base_price, bedrooms, bathrooms, sqft, width, length, sections')
        .order('name')
      const list = (data as Model[]) || []
      setModels(list)
      setFiltered(list)
      if (selectedModelId) {
        const match = list.find(m => m.id === selectedModelId)
        if (match) setSelected(match)
      }
      setLoading(false)
    }
    load()
  }, [selectedModelId])

  useEffect(() => {
    let list = models
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        m =>
          m.name.toLowerCase().includes(q) ||
          m.manufacturer.toLowerCase().includes(q)
      )
    }
    if (filterMfg) {
      list = list.filter(m => m.manufacturer === filterMfg)
    }
    if (filterBed) {
      list = list.filter(m => m.bedrooms === Number(filterBed))
    }
    if (filterPrice) {
      const max = Number(filterPrice)
      list = list.filter(m => m.base_price <= max)
    }
    setFiltered(list)
  }, [search, filterMfg, filterBed, filterPrice, models])

  const manufacturers = [...new Set(models.map(m => m.manufacturer))].sort()
  const bedroomOpts = [...new Set(models.map(m => m.bedrooms).filter(Boolean))].sort() as number[]

  function handleSelect(model: Model) {
    setSelected(model)
    onSelect(model)
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  if (loading) {
    return <p className="text-sm text-slate-400 text-center py-8">Loading models...</p>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Select Home</h2>

      {/* Search + Filters */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search models..."
        className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />

      <div className="flex flex-wrap gap-2">
        <select
          value={filterMfg}
          onChange={e => setFilterMfg(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">All Manufacturers</option>
          {manufacturers.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={filterBed}
          onChange={e => setFilterBed(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Bedrooms</option>
          {bedroomOpts.map(b => (
            <option key={b} value={b}>{b} BR</option>
          ))}
        </select>
        <select
          value={filterPrice}
          onChange={e => setFilterPrice(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Max Price</option>
          <option value="50000">Under $50k</option>
          <option value="75000">Under $75k</option>
          <option value="100000">Under $100k</option>
          <option value="150000">Under $150k</option>
          <option value="200000">Under $200k</option>
        </select>
      </div>

      {/* Selected model card */}
      {selected && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
              <p className="text-xs text-slate-600 mt-0.5">{selected.manufacturer}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <span className="text-xs text-slate-600">{fmt(selected.base_price)}</span>
                {selected.bedrooms && (
                  <span className="text-xs text-slate-600">{selected.bedrooms} BR / {selected.bathrooms} BA</span>
                )}
                {selected.sqft && (
                  <span className="text-xs text-slate-600">{selected.sqft.toLocaleString()} sqft</span>
                )}
                {selected.width && selected.length && (
                  <span className="text-xs text-slate-600">{selected.width} x {selected.length}</span>
                )}
                {selected.sections && (
                  <span className="text-xs text-slate-600">{selected.sections === 1 ? 'Single' : selected.sections === 2 ? 'Double' : 'Triple'} Wide</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Models grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => handleSelect(m)}
            className={`text-left rounded-lg border p-3 transition-colors ${
              selected?.id === m.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">{m.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{m.manufacturer}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-bold text-blue-600">{fmt(m.base_price)}</span>
              {m.bedrooms && (
                <span className="text-xs text-slate-500">{m.bedrooms}BR/{m.bathrooms}BA</span>
              )}
              {m.sqft && (
                <span className="text-xs text-slate-500">{m.sqft.toLocaleString()} sf</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">No models match your filters</p>
      )}
    </div>
  )
}
