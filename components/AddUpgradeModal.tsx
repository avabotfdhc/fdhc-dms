'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import Tabs from '@/components/ui/Tabs'
import FormField from '@/components/ui/FormField'
import CurrencyInput from '@/components/ui/CurrencyInput'

interface CatalogItem {
  id: string
  name: string
  category: string
  retail_price: number
  dealer_cost: number
  installation_cost: number
  installed_by: string | null
  warranty: string | null
}

interface AddUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  agreementId: string
  existingCount: number
  onAdded: () => void
}

const CATEGORIES = [
  { value: 'Appliances', label: 'Appliances' },
  { value: 'Flooring', label: 'Flooring' },
  { value: 'Exterior', label: 'Exterior' },
  { value: 'Interior', label: 'Interior' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'Other', label: 'Other' },
]

function generateItemNumber(count: number): string {
  return `A-${String(count + 1).padStart(3, '0')}`
}

export default function AddUpgradeModal({ isOpen, onClose, agreementId, existingCount, onAdded }: AddUpgradeModalProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('catalog')
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  // Custom form
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [retailPrice, setRetailPrice] = useState(0)
  const [dealerCost, setDealerCost] = useState(0)
  const [installationCost, setInstallationCost] = useState(0)
  const [installedBy, setInstalledBy] = useState('')
  const [warranty, setWarranty] = useState('')

  useEffect(() => {
    if (!isOpen) return
    async function loadCatalog() {
      setLoadingCatalog(true)
      const { data } = await supabase
        .from('upgrades')
        .select('*')
        .order('category', { ascending: true })
      setCatalog((data as CatalogItem[]) || [])
      setLoadingCatalog(false)
    }
    loadCatalog()
  }, [isOpen, supabase])

  function resetCustomForm() {
    setDescription('')
    setCategory('')
    setRetailPrice(0)
    setDealerCost(0)
    setInstallationCost(0)
    setInstalledBy('')
    setWarranty('')
  }

  async function handleAddFromCatalog() {
    if (!selected) return
    const item = catalog.find(c => c.id === selected)
    if (!item) return
    setSubmitting(true)
    await supabase.from('addendum_a_upgrades').insert({
      agreement_id: agreementId,
      item_number: generateItemNumber(existingCount),
      description: item.name,
      category: item.category,
      retail_price: item.retail_price,
      dealer_cost: item.dealer_cost,
      installation_cost: item.installation_cost,
      installed_by: item.installed_by,
      warranty: item.warranty,
    })
    setSubmitting(false)
    setSelected(null)
    onAdded()
    onClose()
  }

  async function handleAddCustom() {
    if (!description || !category) return
    setSubmitting(true)
    await supabase.from('addendum_a_upgrades').insert({
      agreement_id: agreementId,
      item_number: generateItemNumber(existingCount),
      description,
      category,
      retail_price: retailPrice,
      dealer_cost: dealerCost,
      installation_cost: installationCost,
      installed_by: installedBy || null,
      warranty: warranty || null,
    })
    setSubmitting(false)
    resetCustomForm()
    onAdded()
    onClose()
  }

  const tabs = [
    { key: 'catalog', label: 'From Catalog' },
    { key: 'custom', label: 'Custom' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Upgrade" size="lg">
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'catalog' ? (
        <div className="mt-4">
          {loadingCatalog ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No catalog items available.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {catalog.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      selected === item.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.category}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      ${(item.retail_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleAddFromCatalog}
                  disabled={!selected || submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adding...' : 'Add Selected'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <FormField label="Description" name="customDesc" value={description} onChange={e => setDescription(e.target.value)} required />
          <FormField label="Category" name="customCat" type="select" value={category} onChange={e => setCategory(e.target.value)} options={CATEGORIES} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CurrencyInput label="Retail Price" name="customRetail" value={retailPrice} onChange={setRetailPrice} />
            <CurrencyInput label="Dealer Cost" name="customDealer" value={dealerCost} onChange={setDealerCost} />
            <CurrencyInput label="Installation Cost" name="customInstall" value={installationCost} onChange={setInstallationCost} />
          </div>
          <FormField label="Installed By" name="customInstalledBy" value={installedBy} onChange={e => setInstalledBy(e.target.value)} placeholder="e.g. Factory, Dealer, Third-party" />
          <FormField label="Warranty" name="customWarranty" value={warranty} onChange={e => setWarranty(e.target.value)} placeholder="e.g. 1 year manufacturer warranty" />
          <div className="flex justify-end">
            <button
              onClick={handleAddCustom}
              disabled={!description || !category || submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adding...' : 'Add Custom Upgrade'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
