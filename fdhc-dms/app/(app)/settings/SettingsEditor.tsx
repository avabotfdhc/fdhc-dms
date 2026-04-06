'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import SaveIndicator from '@/components/ui/SaveIndicator'

interface Props {
  settingsId: string | null
  settingsData: Record<string, unknown>
}

const dealershipFields = [
  { key: 'dealershipName', label: 'Dealership Name', type: 'text' },
  { key: 'dealershipEmail', label: 'Email', type: 'email' },
  { key: 'dealershipPhone', label: 'Phone', type: 'tel' },
  { key: 'dealershipAddress', label: 'Address', type: 'text' },
]

const defaultFields = [
  { key: 'defaultMarkup', label: 'Default Markup %', type: 'number' },
  { key: 'defaultDocFee', label: 'Doc Fee $', type: 'number' },
  { key: 'defaultSetupFee', label: 'Setup Fee $', type: 'number' },
  { key: 'defaultDealerPack', label: 'Dealer Pack $', type: 'number' },
  { key: 'defaultDeliveryFee', label: 'Delivery Fee $', type: 'number' },
]

export default function SettingsEditor({ settingsId, settingsData }: Props) {
  const supabase = createClient()
  const [editingDealership, setEditingDealership] = useState(false)
  const [editingDefaults, setEditingDefaults] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const [data, setData] = useState<Record<string, unknown>>(settingsData)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>()

  const autoSave = useCallback(async (updated: Record<string, unknown>) => {
    if (!settingsId) return
    setSaveStatus('saving')
    try {
      await supabase.from('settings').update({ data: updated }).eq('id', settingsId)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [settingsId, supabase])

  function handleFieldChange(key: string, value: string) {
    const updated = { ...data, [key]: value }
    setData(updated)
    setSaveStatus('unsaved')
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => autoSave(updated), 1500)
  }

  return (
    <>
      {/* Dealership Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Dealership Info</h2>
          <div className="flex items-center gap-2">
            {(editingDealership || editingDefaults) && <SaveIndicator status={saveStatus} />}
            <button
              onClick={() => setEditingDealership(!editingDealership)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {editingDealership ? 'Done' : 'Edit'}
            </button>
          </div>
        </div>
        {editingDealership ? (
          <div className="space-y-3">
            {dealershipFields.map(f => (
              <div key={f.key} className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">{f.label}</label>
                <input
                  type={f.type}
                  value={String(data[f.key] || '')}
                  onChange={e => handleFieldChange(f.key, e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dealershipFields.map(f => (
              <div key={f.key}>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{f.label}</p>
                <p className="text-sm text-slate-800 mt-0.5">{String(data[f.key] || '—')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Default Values */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Default Values</h2>
          <button
            onClick={() => setEditingDefaults(!editingDefaults)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {editingDefaults ? 'Done' : 'Edit'}
          </button>
        </div>
        {editingDefaults ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {defaultFields.map(f => (
              <div key={f.key} className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">{f.label}</label>
                <input
                  type={f.type}
                  value={String(data[f.key] || '')}
                  onChange={e => handleFieldChange(f.key, e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {defaultFields.map(f => (
              <div key={f.key}>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{f.label}</p>
                <p className="text-sm text-slate-800 mt-0.5">
                  {data[f.key] ? (f.key === 'defaultMarkup' ? `${data[f.key]}%` : `$${Number(data[f.key]).toLocaleString()}`) : '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
