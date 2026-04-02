'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewClientPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const data = {
      first_name: fd.get('first_name') as string,
      last_name: fd.get('last_name') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      address: fd.get('address') as string,
      source: fd.get('source') as string,
      status: fd.get('status') as string,
    }
    const { data: created, error: err } = await supabase.from('clients').insert(data).select('id').single()
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      router.push(`/clients/${created.id}`)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="text-slate-400 hover:text-slate-600 text-sm">← Clients</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium">New Client</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h1 className="text-lg font-bold text-slate-900 mb-4">New Client</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">First Name *</label>
              <input name="first_name" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Last Name *</label>
              <input name="last_name" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input name="email" type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
            <input name="phone" type="tel" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
            <input name="address" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Source</label>
              <select name="source" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">—</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="walk-in">Walk-in</option>
                <option value="phone">Phone</option>
                <option value="facebook">Facebook</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select name="status" defaultValue="lead" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving…' : 'Create Client'}
          </button>
        </form>
      </div>
    </div>
  )
}
