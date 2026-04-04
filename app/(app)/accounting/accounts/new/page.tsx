'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FormField from '@/components/ui/FormField'
import CurrencyInput from '@/components/ui/CurrencyInput'

const TYPE_OPTIONS = [
  { value: 'Asset', label: 'Asset' },
  { value: 'Revenue', label: 'Revenue' },
  { value: 'COGS', label: 'COGS' },
  { value: 'Expense', label: 'Expense' },
  { value: 'Liability', label: 'Liability' },
]

export default function NewAccountPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    code: '',
    name: '',
    type: '',
    opening_balance: 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code || !form.name || !form.type) {
      setError('Code, name, and type are required')
      return
    }

    setSaving(true)
    setError('')

    const { error: insertError } = await supabase
      .from('accounts')
      .insert({
        code: form.code,
        name: form.name,
        type: form.type,
        balance: form.opening_balance,
      })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push('/accounting')
  }

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/accounting" className="text-slate-400 hover:text-slate-600 text-sm">&larr; Accounting</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium">New Account</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
          <FormField
            label="Account Code"
            name="code"
            value={form.code}
            onChange={handleChange}
            required
            placeholder="e.g. 1100"
            helpText="Numeric code for sorting and reference"
          />
          <FormField
            label="Account Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="e.g. Accounts Receivable"
          />
          <FormField
            type="select"
            label="Type"
            name="type"
            value={form.type}
            onChange={handleChange}
            required
            options={TYPE_OPTIONS}
          />
          <CurrencyInput
            label="Opening Balance"
            name="opening_balance"
            value={form.opening_balance}
            onChange={val => setForm(prev => ({ ...prev, opening_balance: val }))}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Account'}
          </button>
          <Link
            href="/accounting"
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
