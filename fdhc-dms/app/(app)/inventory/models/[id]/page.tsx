import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ModelDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: model } = await supabase
    .from('models')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!model) notFound()

  const details = [
    { label: 'Manufacturer', value: model.manufacturer },
    { label: 'Series', value: model.series },
    { label: 'Model Number', value: model.model_number },
    { label: 'Year', value: model.year },
    { label: 'Type', value: model.type },
    { label: 'Construction', value: model.construction_type },
    { label: 'Dimensions', value: model.width && model.length ? `${model.width}' × ${model.length}'` : null },
    { label: 'Sq Ft', value: model.sq_ft ? `${model.sq_ft?.toLocaleString()} sqft` : null },
    { label: 'Bedrooms', value: model.bedrooms },
    { label: 'Bathrooms', value: model.bathrooms },
    { label: 'Den', value: model.has_den ? 'Yes' : null },
  ]

  const pricing = [
    { label: 'Base Price', value: model.base_price ? `$${Number(model.base_price).toLocaleString()}` : null },
    { label: 'MSRP', value: model.msrp ? `$${Number(model.msrp).toLocaleString()}` : null },
    { label: 'Markup %', value: model.markup_percentage ? `${model.markup_percentage}%` : null },
    { label: 'Dealer Pack', value: model.dealer_pack ? `$${Number(model.dealer_pack).toLocaleString()}` : null },
    { label: 'Holdback', value: model.dealer_holdback ? `$${Number(model.dealer_holdback).toLocaleString()}` : null },
  ]

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventory" className="text-slate-400 hover:text-slate-600 text-sm">← Inventory</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium">{model.model_name}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <h1 className="text-xl font-bold text-slate-900 mb-1">{model.model_name}</h1>
        <p className="text-slate-500 text-sm">{model.manufacturer} · {model.series}</p>

        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mt-5 mb-3">Specifications</h2>
        <div className="grid grid-cols-2 gap-3">
          {details.filter(d => d.value).map(d => (
            <div key={d.label}>
              <p className="text-xs text-slate-400">{d.label}</p>
              <p className="text-sm font-medium text-slate-800">{String(d.value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Pricing</h2>
        <div className="grid grid-cols-2 gap-3">
          {pricing.filter(d => d.value).map(d => (
            <div key={d.label}>
              <p className="text-xs text-slate-400">{d.label}</p>
              <p className="text-sm font-bold text-slate-900">{String(d.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
