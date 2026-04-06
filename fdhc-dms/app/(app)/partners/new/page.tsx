'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FormField from '@/components/ui/FormField'
import SaveIndicator from '@/components/ui/SaveIndicator'
import Link from 'next/link'

const roleOptions = [
  { value: 'lender', label: 'Lender' },
  { value: 'installer', label: 'Installer' },
  { value: 'transporter', label: 'Transporter' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'other', label: 'Other' },
]

export default function NewPartnerPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const [submitting, setSubmitting] = useState(false)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>()

  const [form, setForm] = useState({
    role: '',
    sub_type: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    notes: '',
  })

  const autoSave = useCallback(async (data: typeof form, id: string | null) => {
    if (!data.company_name) return
    setSaveStatus('saving')
    try {
      if (id) {
        await supabase.from('partners').update(data).eq('id', id)
      } else {
        const { data: inserted } = await supabase.from('partners').insert(data).select('id').single()
        if (inserted) setPartnerId(inserted.id)
      }
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [supabase])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    const next = { ...form, [name]: value }
    setForm(next)
    setSaveStatus('unsaved')

    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => autoSave(next, partnerId), 1500)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    setSubmitting(true)
    setSaveStatus('saving')

    try {
      if (partnerId) {
        await supabase.from('partners').update(form).eq('id', partnerId)
      } else {
        await supabase.from('partners').insert(form)
      }
      setSaveStatus('saved')
      router.push('/partners')
    } catch {
      setSaveStatus('error')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/partners" className="text-slate-400 hover:text-slate-600 text-sm">&larr; Partners</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">New Partner</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Add Partner</h1>
        <SaveIndicator status={saveStatus} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Role" name="role" type="select" value={form.role} onChange={handleChange} required options={roleOptions} />
            <FormField label="Sub-type" name="sub_type" value={form.sub_type} onChange={handleChange} placeholder="e.g., Chattel, FHA, VA" />
          </div>
          <FormField label="Company Name" name="company_name" value={form.company_name} onChange={handleChange} required />
          <FormField label="Contact Person" name="contact_person" value={form.contact_person} onChange={handleChange} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
            <FormField label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
          </div>
          <FormField label="Address" name="address" value={form.address} onChange={handleChange} />
          <FormField label="Website" name="website" value={form.website} onChange={handleChange} placeholder="https://..." />
          <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !form.company_name || !form.role}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving...' : 'Save Partner'}
          </button>
          <Link
            href="/partners"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
