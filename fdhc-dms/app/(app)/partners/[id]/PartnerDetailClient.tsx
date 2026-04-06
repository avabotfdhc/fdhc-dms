'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import FormField from '@/components/ui/FormField'
import SaveIndicator from '@/components/ui/SaveIndicator'

const roleOptions = [
  { value: 'lender', label: 'Lender' },
  { value: 'installer', label: 'Installer' },
  { value: 'transporter', label: 'Transporter' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'other', label: 'Other' },
]

interface Partner {
  id: string
  role: string
  sub_type: string | null
  company_name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  notes: string | null
  documents: unknown[] | null
  [key: string]: unknown
}

export default function PartnerDetailClient({ partner }: { partner: Partner }) {
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>()

  const [form, setForm] = useState({
    role: partner.role || '',
    sub_type: partner.sub_type || '',
    company_name: partner.company_name || '',
    contact_person: partner.contact_person || '',
    email: partner.email || '',
    phone: partner.phone || '',
    address: partner.address || '',
    website: partner.website || '',
    notes: partner.notes || '',
  })

  const autoSave = useCallback(async (data: typeof form) => {
    setSaveStatus('saving')
    try {
      await supabase.from('partners').update(data).eq('id', partner.id)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [supabase, partner.id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    const next = { ...form, [name]: value }
    setForm(next)
    setSaveStatus('unsaved')
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => autoSave(next), 1500)
  }

  const documents = (Array.isArray(partner.documents) ? partner.documents : []) as Record<string, unknown>[]

  if (!editing) {
    return (
      <div className="space-y-4">
        {/* Details card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Details</h2>
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Role', value: form.role },
              { label: 'Sub-type', value: form.sub_type },
              { label: 'Company', value: form.company_name },
              { label: 'Contact', value: form.contact_person },
              { label: 'Email', value: form.email },
              { label: 'Phone', value: form.phone },
              { label: 'Address', value: form.address },
              { label: 'Website', value: form.website },
            ].filter(f => f.value).map(f => (
              <div key={f.label}>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{f.label}</p>
                <p className="text-sm text-slate-800 mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {form.notes && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Notes</h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{form.notes}</p>
          </div>
        )}

        {/* Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Documents</h2>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc: Record<string, unknown>, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 text-lg">📄</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{String(doc.name || doc.filename || `Document ${i + 1}`)}</p>
                    {doc.type ? <p className="text-xs text-slate-500">{String(doc.type)}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No documents</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SaveIndicator status={saveStatus} />
        <button
          onClick={() => setEditing(false)}
          className="text-sm text-slate-600 hover:text-slate-800 font-medium"
        >
          Done Editing
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Role" name="role" type="select" value={form.role} onChange={handleChange} options={roleOptions} />
          <FormField label="Sub-type" name="sub_type" value={form.sub_type} onChange={handleChange} />
        </div>
        <FormField label="Company Name" name="company_name" value={form.company_name} onChange={handleChange} />
        <FormField label="Contact Person" name="contact_person" value={form.contact_person} onChange={handleChange} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
          <FormField label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
        </div>
        <FormField label="Address" name="address" value={form.address} onChange={handleChange} />
        <FormField label="Website" name="website" value={form.website} onChange={handleChange} />
        <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
      </div>
    </div>
  )
}
