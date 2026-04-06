'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
}

interface StepClientProps {
  selectedClientId: string | null
  onSelect: (client: Client) => void
}

export default function StepClient({ selectedClientId, onSelect }: StepClientProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Client[]>([])
  const [selected, setSelected] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)

  // Load selected client on mount if editing
  useEffect(() => {
    if (!selectedClientId) return
    const supabase = createClient()
    supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone, address')
      .eq('id', selectedClientId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelected(data as Client)
        }
      })
  }, [selectedClientId])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setLoading(true)
      const supabase = createClient()
      const term = `%${query}%`
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, phone, address')
        .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
        .limit(10)
      setResults((data as Client[]) || [])
      setLoading(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  function handleSelect(client: Client) {
    setSelected(client)
    setQuery('')
    setResults([])
    onSelect(client)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Select Client</h2>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            Searching...
          </span>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                selected?.id === c.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">
                {c.first_name} {c.last_name}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                {c.email && <span className="text-xs text-slate-500">{c.email}</span>}
                {c.phone && <span className="text-xs text-slate-500">{c.phone}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">No clients found</p>
      )}

      {/* Selected client card */}
      {selected && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {selected.first_name} {selected.last_name}
              </p>
              <div className="mt-1 space-y-0.5">
                {selected.email && (
                  <p className="text-xs text-slate-600">{selected.email}</p>
                )}
                {selected.phone && (
                  <p className="text-xs text-slate-600">{selected.phone}</p>
                )}
                {selected.address && (
                  <p className="text-xs text-slate-600">{selected.address}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Change
            </button>
          </div>
        </div>
      )}

      <Link
        href="/clients/new"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Create New Client
      </Link>
    </div>
  )
}
