'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Badge from '@/components/ui/Badge'
import AddUpgradeModal from '@/components/AddUpgradeModal'

interface AddendumUpgrade {
  id: string
  item_number: string
  description: string
  category: string
  retail_price: number
  dealer_cost: number
  installation_cost: number
  installed_by: string | null
  warranty: string | null
}

const categoryVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'> = {
  'Appliances': 'info',
  'Flooring': 'success',
  'Exterior': 'warning',
  'Interior': 'purple',
  'Electrical': 'danger',
  'Plumbing': 'info',
  'HVAC': 'neutral',
  'Other': 'neutral',
}

interface AddendumAFormProps {
  agreementId: string
}

export default function AddendumAForm({ agreementId }: AddendumAFormProps) {
  const supabase = createClient()
  const [upgrades, setUpgrades] = useState<AddendumUpgrade[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchUpgrades = useCallback(async () => {
    const { data } = await supabase
      .from('addendum_a_upgrades')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('item_number', { ascending: true })

    setUpgrades((data as AddendumUpgrade[]) || [])
    setLoading(false)
  }, [agreementId, supabase])

  useEffect(() => { fetchUpgrades() }, [fetchUpgrades])

  async function handleRemove(id: string) {
    setRemoving(id)
    await supabase.from('addendum_a_upgrades').delete().eq('id', id)
    setUpgrades(prev => prev.filter(u => u.id !== id))
    setRemoving(null)
  }

  const totalRetail = upgrades.reduce((sum, u) => sum + (u.retail_price || 0), 0)
  const totalInstall = upgrades.reduce((sum, u) => sum + (u.installation_cost || 0), 0)
  const grandTotal = totalRetail + totalInstall

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Addendum A - Upgrades</h2>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Add Upgrade
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : upgrades.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No upgrades added yet.</p>
      ) : (
        <>
          <div className="space-y-3">
            {upgrades.map(u => (
              <div key={u.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-slate-500">{u.item_number}</span>
                    <Badge text={u.category} variant={categoryVariant[u.category] || 'neutral'} size="sm" />
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-1">{u.description}</p>
                  <div className="flex gap-4 mt-1 text-xs text-slate-500">
                    <span>Retail: ${(u.retail_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <span>Install: ${(u.installation_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(u.id)}
                  disabled={removing === u.id}
                  className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {removing === u.id ? '...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>

          {/* Running Total */}
          <div className="mt-4 rounded-lg bg-slate-50 p-3 space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Total Retail</span>
              <span>${totalRetail.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Total Installation</span>
              <span>${totalInstall.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-slate-900 pt-1 border-t border-slate-200">
              <span>Grand Total</span>
              <span>${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </>
      )}

      <AddUpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        agreementId={agreementId}
        existingCount={upgrades.length}
        onAdded={fetchUpgrades}
      />
    </div>
  )
}
