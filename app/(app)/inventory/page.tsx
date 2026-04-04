import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import InventoryStatusUpdate from '@/components/InventoryStatusUpdate'
import ModelFilter from '@/components/ModelFilter'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>
}) {
  const { model: modelFilter } = await searchParams
  const supabase = await createClient()

  let inventoryQuery = supabase
    .from('inventory')
    .select('*, models(model_name, manufacturer, series, width, length, bedrooms, bathrooms)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (modelFilter) {
    inventoryQuery = inventoryQuery.eq('model_id', modelFilter)
  }

  const [
    { data: inventory, count: invCount },
    { data: models, count: modelCount },
  ] = await Promise.all([
    inventoryQuery,
    supabase
      .from('models')
      .select('*', { count: 'exact' })
      .order('manufacturer', { ascending: true }),
  ])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory & Models</h1>
          <p className="text-slate-500 text-sm">{invCount} in inventory · {modelCount} models</p>
        </div>
        <Link
          href="/inventory/new"
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Unit
        </Link>
      </div>

      {/* Inventory */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Current Inventory ({invCount})</h2>
          <ModelFilter
            models={(models || []).map(m => ({ id: m.id, manufacturer: m.manufacturer, model_name: m.model_name }))}
            currentFilter={modelFilter || ''}
          />
        </div>
        {invCount === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400 text-sm">
            No inventory units {modelFilter ? 'matching this model' : 'on lot'}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
            {inventory?.map(unit => (
              <div key={unit.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      #{unit.stock_number} — {(unit.models as Record<string, unknown>)?.model_name || 'Unknown Model'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(unit.models as Record<string, unknown>)?.manufacturer} · VIN: {unit.vin || '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <InventoryStatusUpdate
                      inventoryId={unit.id}
                      currentStatus={unit.status}
                    />
                    {unit.factory_direct_price && (
                      <span className="text-sm font-semibold text-slate-900">
                        ${Number(unit.factory_direct_price).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Models catalog */}
      <div>
        <h2 className="font-semibold text-slate-700 text-sm mb-3 uppercase tracking-wide">Model Catalog ({modelCount})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {models?.map(model => (
            <Link
              key={model.id}
              href={`/inventory/models/${model.id}`}
              className="bg-white rounded-xl border border-slate-100 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{model.model_name}</p>
                  <p className="text-xs text-slate-500">{model.manufacturer} · {model.series}</p>
                </div>
                {model.base_price && (
                  <p className="text-sm font-bold text-blue-600">${Number(model.base_price).toLocaleString()}</p>
                )}
              </div>
              <div className="flex gap-3 text-xs text-slate-500">
                {model.width && model.length && (
                  <span>📐 {model.width}×{model.length}</span>
                )}
                {model.bedrooms && <span>🛏 {model.bedrooms}bd</span>}
                {model.bathrooms && <span>🚿 {model.bathrooms}ba</span>}
                {model.sq_ft && <span>📏 {model.sq_ft} sqft</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
