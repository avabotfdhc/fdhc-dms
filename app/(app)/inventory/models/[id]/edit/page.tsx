'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FormField from '@/components/ui/FormField'
import CurrencyInput from '@/components/ui/CurrencyInput'
import SaveIndicator from '@/components/ui/SaveIndicator'
import { useAutoSave } from '@/lib/use-autosave'

const TYPE_OPTIONS = [
  { value: 'single_wide', label: 'Single Wide' },
  { value: 'double_wide', label: 'Double Wide' },
  { value: 'triple_wide', label: 'Triple Wide' },
  { value: 'park_model', label: 'Park Model' },
]

const CONSTRUCTION_OPTIONS = [
  { value: 'manufactured', label: 'Manufactured' },
  { value: 'modular', label: 'Modular' },
  { value: 'park_model', label: 'Park Model' },
]

export default function EditModelPage() {
  const params = useParams()
  const modelId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    manufacturer: '',
    series: '',
    model_number: '',
    model_name: '',
    year: new Date().getFullYear(),
    type: '',
    construction_type: '',
    width: 0,
    length: 0,
    sq_ft: 0,
    bedrooms: 0,
    bathrooms: 0,
    has_den: false,
    base_price: 0,
    msrp: 0,
    markup_percentage: 0,
    dealer_pack: 0,
    dealer_holdback: 0,
  })

  const { status } = useAutoSave({
    table: 'models',
    id: modelId,
    data: form,
    enabled: !loading,
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('models').select('*').eq('id', modelId).single()
      if (data) {
        setForm({
          manufacturer: data.manufacturer || '',
          series: data.series || '',
          model_number: data.model_number || '',
          model_name: data.model_name || '',
          year: data.year || new Date().getFullYear(),
          type: data.type || '',
          construction_type: data.construction_type || '',
          width: data.width || 0,
          length: data.length || 0,
          sq_ft: data.sq_ft || 0,
          bedrooms: data.bedrooms || 0,
          bathrooms: data.bathrooms || 0,
          has_den: data.has_den || false,
          base_price: data.base_price || 0,
          msrp: data.msrp || 0,
          markup_percentage: data.markup_percentage || 0,
          dealer_pack: data.dealer_pack || 0,
          dealer_holdback: data.dealer_holdback || 0,
        })
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value,
    }))
  }

  function handleCurrencyChange(field: string) {
    return (value: number) => setForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-48" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="text-slate-400 hover:text-slate-600 text-sm">&larr; Inventory</Link>
          <span className="text-slate-300">/</span>
          <Link href={`/inventory/models/${modelId}`} className="text-slate-400 hover:text-slate-600 text-sm">
            {form.model_name || 'Model'}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium">Edit</span>
        </div>
        <SaveIndicator status={status} />
      </div>

      <div className="space-y-6">
        {/* General info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">General</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleChange} required />
              <FormField label="Series" name="series" value={form.series} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Model Number" name="model_number" value={form.model_number} onChange={handleChange} />
              <FormField label="Model Name" name="model_name" value={form.model_name} onChange={handleChange} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField type="number" label="Year" name="year" value={form.year} onChange={handleChange} />
              <FormField type="select" label="Type" name="type" value={form.type} onChange={handleChange} options={TYPE_OPTIONS} />
              <FormField type="select" label="Construction" name="construction_type" value={form.construction_type} onChange={handleChange} options={CONSTRUCTION_OPTIONS} />
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Dimensions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FormField type="number" label="Width (ft)" name="width" value={form.width} onChange={handleChange} />
            <FormField type="number" label="Length (ft)" name="length" value={form.length} onChange={handleChange} />
            <FormField type="number" label="Sq Ft" name="sq_ft" value={form.sq_ft} onChange={handleChange} />
            <FormField type="number" label="Bedrooms" name="bedrooms" value={form.bedrooms} onChange={handleChange} />
            <FormField type="number" label="Bathrooms" name="bathrooms" value={form.bathrooms} onChange={handleChange} />
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="has_den"
                checked={form.has_den}
                onChange={e => setForm(prev => ({ ...prev, has_den: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
              />
              <label htmlFor="has_den" className="text-sm font-medium text-slate-700">Has Den</label>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Pricing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CurrencyInput label="Base Price" name="base_price" value={form.base_price} onChange={handleCurrencyChange('base_price')} />
            <CurrencyInput label="MSRP" name="msrp" value={form.msrp} onChange={handleCurrencyChange('msrp')} />
            <FormField type="number" label="Markup %" name="markup_percentage" value={form.markup_percentage} onChange={handleChange} />
            <CurrencyInput label="Dealer Pack" name="dealer_pack" value={form.dealer_pack} onChange={handleCurrencyChange('dealer_pack')} />
            <CurrencyInput label="Dealer Holdback" name="dealer_holdback" value={form.dealer_holdback} onChange={handleCurrencyChange('dealer_holdback')} />
          </div>
        </div>

        <div>
          <Link
            href={`/inventory/models/${modelId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            &larr; Back to Model
          </Link>
        </div>
      </div>
    </div>
  )
}
