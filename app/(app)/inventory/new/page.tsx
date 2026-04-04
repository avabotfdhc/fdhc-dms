'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FormField from '@/components/ui/FormField'
import CurrencyInput from '@/components/ui/CurrencyInput'
import SaveIndicator from '@/components/ui/SaveIndicator'
import { useAutoSave, type AutoSaveStatus } from '@/lib/use-autosave'

interface Model {
  id: string
  model_name: string
  manufacturer: string
  series: string
}

interface Upgrade {
  id: string
  name: string
  cost: number
}

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'factory_order', label: 'Factory Order' },
  { value: 'in_production', label: 'In Production' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'on_lot', label: 'On Lot' },
  { value: 'reserved', label: 'Reserved' },
]

export default function NewInventoryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [models, setModels] = useState<Model[]>([])
  const [upgrades, setUpgrades] = useState<Upgrade[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [unitId, setUnitId] = useState<string | null>(null)

  const [form, setForm] = useState({
    model_id: '',
    stock_number: '',
    vin: '',
    year: new Date().getFullYear(),
    invoice_price: 0,
    msrp: 0,
    factory_direct_price: 0,
    sale_price: 0,
    freight_cost: 0,
    location: '',
    status: 'available',
    notes: '',
  })

  const [selectedUpgrades, setSelectedUpgrades] = useState<string[]>([])

  // Auto-save after initial creation
  const { status: autoSaveStatus } = useAutoSave({
    table: 'inventory',
    id: unitId || '',
    data: form,
    enabled: !!unitId,
  })

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: u }] = await Promise.all([
        supabase.from('models').select('id, model_name, manufacturer, series').order('manufacturer'),
        supabase.from('upgrades').select('id, name, cost').order('name'),
      ])
      if (m) setModels(m)
      if (u) setUpgrades(u)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) || 0 : value,
    }))
  }

  function handleCurrencyChange(field: string) {
    return (value: number) => setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleUpgrade(id: string) {
    setSelectedUpgrades(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.model_id) {
      setError('Please select a model')
      return
    }
    if (!form.stock_number) {
      setError('Stock number is required')
      return
    }

    setSaving(true)
    setError('')

    const { data, error: insertError } = await supabase
      .from('inventory')
      .insert({
        ...form,
        installed_upgrades: selectedUpgrades,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    if (data) {
      setUnitId(data.id)
    }

    router.push('/inventory')
  }

  const displayStatus: AutoSaveStatus = unitId ? autoSaveStatus : 'unsaved'

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="text-slate-400 hover:text-slate-600 text-sm">
            &larr; Inventory
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium">Add Unit</span>
        </div>
        <SaveIndicator status={displayStatus} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Model selection */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Unit Details</h2>
          <div className="space-y-4">
            <FormField
              type="select"
              label="Model"
              name="model_id"
              value={form.model_id}
              onChange={handleChange}
              required
              placeholder="Select model..."
              options={models.map(m => ({
                value: m.id,
                label: `${m.manufacturer} - ${m.model_name} (${m.series})`,
              }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Stock Number"
                name="stock_number"
                value={form.stock_number}
                onChange={handleChange}
                required
                placeholder="e.g. STK-001"
              />
              <FormField
                label="VIN"
                name="vin"
                value={form.vin}
                onChange={handleChange}
                placeholder="Vehicle ID"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                type="number"
                label="Year"
                name="year"
                value={form.year}
                onChange={handleChange}
              />
              <FormField
                type="select"
                label="Status"
                name="status"
                value={form.status}
                onChange={handleChange}
                options={STATUS_OPTIONS}
              />
            </div>
            <FormField
              label="Location"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Lot location"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Pricing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CurrencyInput label="Invoice Price" name="invoice_price" value={form.invoice_price} onChange={handleCurrencyChange('invoice_price')} />
            <CurrencyInput label="MSRP" name="msrp" value={form.msrp} onChange={handleCurrencyChange('msrp')} />
            <CurrencyInput label="Factory Direct Price" name="factory_direct_price" value={form.factory_direct_price} onChange={handleCurrencyChange('factory_direct_price')} />
            <CurrencyInput label="Sale Price" name="sale_price" value={form.sale_price} onChange={handleCurrencyChange('sale_price')} />
            <CurrencyInput label="Freight Cost" name="freight_cost" value={form.freight_cost} onChange={handleCurrencyChange('freight_cost')} />
          </div>
        </div>

        {/* Upgrades */}
        {upgrades.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Installed Upgrades</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {upgrades.map(u => (
                <label key={u.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUpgrades.includes(u.id)}
                    onChange={() => toggleUpgrade(u.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                  />
                  <span>{u.name}</span>
                  {u.cost > 0 && (
                    <span className="text-slate-400">(${Number(u.cost).toLocaleString()})</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Notes</h2>
          <FormField
            type="textarea"
            label="Notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Any additional notes about this unit..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Adding Unit...' : 'Add to Inventory'}
          </button>
          <Link
            href="/inventory"
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
