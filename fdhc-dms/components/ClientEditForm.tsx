'use client'

import { useState } from 'react'
import { useAutoSave, type AutoSaveStatus } from '@/lib/use-autosave'
import SaveIndicator from '@/components/ui/SaveIndicator'

interface ClientData {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  delivery_address: string
  delivery_city: string
  delivery_state: string
  delivery_zip: string
  delivery_county: string
  source: string
  status: string
  land_status: string
  tags: string[]
}

interface ClientEditFormProps {
  client: ClientData
  onSave?: (data: ClientData) => void
}

const inputClass =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-xs font-medium text-slate-600 mb-1'

export default function ClientEditForm({ client, onSave }: ClientEditFormProps) {
  const [form, setForm] = useState<ClientData>({
    id: client.id,
    first_name: client.first_name || '',
    last_name: client.last_name || '',
    email: client.email || '',
    phone: client.phone || '',
    address: client.address || '',
    delivery_address: client.delivery_address || '',
    delivery_city: client.delivery_city || '',
    delivery_state: client.delivery_state || '',
    delivery_zip: client.delivery_zip || '',
    delivery_county: client.delivery_county || '',
    source: client.source || '',
    status: client.status || 'lead',
    land_status: client.land_status || 'unknown',
    tags: Array.isArray(client.tags) ? client.tags : [],
  })

  const [tagInput, setTagInput] = useState('')

  const { status, saveNow, error } = useAutoSave({
    table: 'clients',
    id: client.id,
    data: {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      delivery_address: form.delivery_address,
      delivery_city: form.delivery_city,
      delivery_state: form.delivery_state,
      delivery_zip: form.delivery_zip,
      delivery_county: form.delivery_county,
      source: form.source,
      status: form.status,
      land_status: form.land_status,
      tags: form.tags,
    },
  })

  function update(field: keyof ClientData, value: string | string[]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addTag() {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      update('tags', [...form.tags, tag])
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    update('tags', form.tags.filter(t => t !== tag))
  }

  async function handleManualSave() {
    await saveNow()
    onSave?.(form)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Edit Client</h2>
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          <button
            type="button"
            onClick={handleManualSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>First Name *</label>
          <input
            value={form.first_name}
            onChange={e => update('first_name', e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Last Name *</label>
          <input
            value={form.last_name}
            onChange={e => update('last_name', e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      {/* Contact */}
      <div>
        <label className={labelClass}>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={e => update('email', e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input
          type="tel"
          value={form.phone}
          onChange={e => update('phone', e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Address */}
      <div>
        <label className={labelClass}>Address</label>
        <input
          value={form.address}
          onChange={e => update('address', e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Delivery */}
      <fieldset className="border border-slate-200 rounded-lg p-4">
        <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
          Delivery Address
        </legend>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Street</label>
            <input
              value={form.delivery_address}
              onChange={e => update('delivery_address', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>City</label>
              <input
                value={form.delivery_city}
                onChange={e => update('delivery_city', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input
                value={form.delivery_state}
                onChange={e => update('delivery_state', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>ZIP</label>
              <input
                value={form.delivery_zip}
                onChange={e => update('delivery_zip', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>County</label>
              <input
                value={form.delivery_county}
                onChange={e => update('delivery_county', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* Selects */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Source</label>
          <select
            value={form.source}
            onChange={e => update('source', e.target.value)}
            className={inputClass}
          >
            <option value="">--</option>
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="walk-in">Walk-in</option>
            <option value="phone">Phone</option>
            <option value="facebook">Facebook</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.status}
            onChange={e => update('status', e.target.value)}
            className={inputClass}
          >
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="lost">Lost</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Land Status</label>
          <select
            value={form.land_status}
            onChange={e => update('land_status', e.target.value)}
            className={inputClass}
          >
            <option value="unknown">Unknown</option>
            <option value="owns_land">Owns Land</option>
            <option value="buying_land">Buying Land</option>
            <option value="needs_land">Needs Land</option>
            <option value="renting_lot">Renting Lot</option>
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={labelClass}>Tags</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-blue-400 hover:text-blue-700"
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="Add tag..."
            className={inputClass}
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
