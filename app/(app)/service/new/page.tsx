'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FormField from '@/components/ui/FormField'
import Link from 'next/link'

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const categoryOptions = [
  { value: 'warranty', label: 'Warranty' },
  { value: 'repair', label: 'Repair' },
  { value: 'installation', label: 'Installation' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'other', label: 'Other' },
]

export default function NewServiceTicketPage() {
  const router = useRouter()
  const supabase = createClient()
  const [submitting, setSubmitting] = useState(false)

  // Client search
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<{ id: string; first_name: string; last_name: string }[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  // Deals for selected client
  const [deals, setDeals] = useState<{ id: string; deal_number: number; status: string }[]>([])
  const [selectedDeal, setSelectedDeal] = useState<string>('')

  const [form, setForm] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: '',
  })

  // Search clients
  useEffect(() => {
    if (clientSearch.length < 2) { setClients([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .or(`first_name.ilike.%${clientSearch}%,last_name.ilike.%${clientSearch}%`)
        .limit(10)
      if (data) setClients(data)
    }, 300)
    return () => clearTimeout(timer)
  }, [clientSearch, supabase])

  // Load deals when client changes
  useEffect(() => {
    if (!selectedClient) { setDeals([]); return }
    async function loadDeals() {
      const { data } = await supabase
        .from('agreements')
        .select('id, deal_number, status')
        .eq('client_id', selectedClient)
        .order('deal_number', { ascending: false })
      if (data) setDeals(data)
    }
    loadDeals()
  }, [selectedClient, supabase])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await supabase.from('service_tickets').insert({
        client_id: selectedClient || null,
        agreement_id: selectedDeal || null,
        subject: form.subject,
        status: 'open',
        priority: form.priority,
        data: {
          description: form.description,
          category: form.category,
        },
      })
      router.push('/service')
    } catch {
      setSubmitting(false)
    }
  }

  const selectedClientName = clients.find(c => c.id === selectedClient)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/service" className="text-slate-400 hover:text-slate-600 text-sm">&larr; Service</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">New Ticket</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">New Service Ticket</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
          {/* Client search */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Client <span className="ml-0.5 text-red-500">*</span>
            </label>
            {selectedClient && selectedClientName ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-800">
                  {selectedClientName.first_name} {selectedClientName.last_name}
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedClient(''); setClientSearch(''); setSelectedDeal('') }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true) }}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder="Search clients..."
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                />
                {showClientDropdown && clients.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                    {clients.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(c.id)
                          setClientSearch(`${c.first_name} ${c.last_name}`)
                          setShowClientDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                      >
                        {c.first_name} {c.last_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Deal selector */}
          {deals.length > 0 && (
            <FormField
              label="Related Deal"
              name="selectedDeal"
              type="select"
              value={selectedDeal}
              onChange={(e) => setSelectedDeal(e.target.value)}
              options={deals.map(d => ({ value: d.id, label: `Deal #${d.deal_number} (${d.status})` }))}
              placeholder="None (optional)"
            />
          )}

          <FormField label="Subject" name="subject" value={form.subject} onChange={handleChange} required />
          <FormField label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Priority" name="priority" type="select" value={form.priority} onChange={handleChange} options={priorityOptions} />
            <FormField label="Category" name="category" type="select" value={form.category} onChange={handleChange} options={categoryOptions} />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !form.subject || !selectedClient}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating...' : 'Create Ticket'}
          </button>
          <Link
            href="/service"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
