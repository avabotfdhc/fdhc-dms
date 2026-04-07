'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface CommItem {
  id: string
  client_id: string
  activity_type: string
  status: string
  scheduled_date: string
  notes: string | null
  created_at: string
  clients?: {
    id: string
    first_name: string
    last_name: string
    phone: string | null
    email: string | null
  } | null
}

interface Template {
  id: string
  name: string
  type: string
  body: string
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  phone_call: { icon: '📞', color: 'text-blue-700', bg: 'bg-blue-50' },
  email:      { icon: '✉️', color: 'text-purple-700', bg: 'bg-purple-50' },
  sms:        { icon: '💬', color: 'text-green-700', bg: 'bg-green-50' },
  appointment:{ icon: '📅', color: 'text-amber-700', bg: 'bg-amber-50' },
  site_visit: { icon: '🏠', color: 'text-orange-700', bg: 'bg-orange-50' },
  note:       { icon: '📝', color: 'text-slate-700', bg: 'bg-slate-50' },
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CommunicationsClient({ items, templates }: { items: CommItem[]; templates: Template[] }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CommItem | null>(null)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)

  const filters = [
    { id: 'all',         label: 'All' },
    { id: 'phone_call',  label: 'Calls' },
    { id: 'email',       label: 'Email' },
    { id: 'sms',         label: 'SMS' },
    { id: 'appointment', label: 'Appts' },
  ]

  const filtered = items.filter(item => {
    if (filter !== 'all' && item.activity_type !== filter) return false
    if (search) {
      const name = `${item.clients?.first_name || ''} ${item.clients?.last_name || ''}`.toLowerCase()
      if (!name.includes(search.toLowerCase())) return false
    }
    return true
  })

  async function handleLogActivity(clientId: string, type: string) {
    if (!noteText.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('scheduled_follow_ups').insert({
      client_id: clientId,
      activity_type: type,
      status: 'completed',
      notes: noteText,
      scheduled_date: new Date().toISOString(),
    })
    setNoteText('')
    setSaving(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Communications Hub</h1>
          <p className="text-slate-400 text-sm mt-0.5">All client communications in one place</p>
        </div>
        <Link href="/clients" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
          + Log Activity
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by client name…"
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity stream */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">{filtered.length} activities</p>
          </div>
          <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-slate-500 font-medium">No communications found</p>
              </div>
            ) : filtered.map(item => {
              const cfg = TYPE_CONFIG[item.activity_type] || TYPE_CONFIG.note
              const client = item.clients
              const name = client ? `${client.first_name} ${client.last_name}` : 'Unknown'

              return (
                <button key={item.id} onClick={() => setSelected(item === selected ? null : item)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors ${selected?.id === item.id ? 'bg-blue-50' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center text-base shrink-0`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-600'}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className={`text-xs font-medium ${cfg.color} capitalize mt-0.5`}>
                      {item.activity_type.replace(/_/g, ' ')}
                      {item.scheduled_date && (
                        <span className="text-slate-400 font-normal"> · {new Date(item.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                      )}
                    </p>
                    {item.notes && <p className="text-xs text-slate-500 mt-1 truncate">{item.notes}</p>}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{timeAgo(item.created_at)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {selected?.clients ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                  {(selected.clients.first_name?.[0] || '') + (selected.clients.last_name?.[0] || '')}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selected.clients.first_name} {selected.clients.last_name}</p>
                  <Link href={`/clients/${selected.clients.id}`} className="text-xs text-blue-600 hover:underline">
                    View full profile →
                  </Link>
                </div>
              </div>
              {selected.clients.phone && (
                <a href={`tel:${selected.clients.phone}`}
                  className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 transition-colors mb-1">
                  <span>📞</span>
                  <span className="text-sm text-slate-700">{selected.clients.phone}</span>
                </a>
              )}
              {selected.clients.email && (
                <a href={`mailto:${selected.clients.email}`}
                  className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <span>✉️</span>
                  <span className="text-sm text-slate-700 truncate">{selected.clients.email}</span>
                </a>
              )}
              {selected.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{selected.notes}</p>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-2">Quick Log</p>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Log a note, call, or message…"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
                />
                <div className="grid grid-cols-3 gap-1.5">
                  {['phone_call', 'email', 'sms'].map(type => (
                    <button key={type} disabled={saving || !noteText.trim()}
                      onClick={() => handleLogActivity(selected.client_id, type)}
                      className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-700 transition-colors disabled:opacity-50 capitalize">
                      {TYPE_CONFIG[type].icon} {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center py-12">
              <p className="text-3xl mb-2">💬</p>
              <p className="text-slate-500 font-medium text-sm">Select an activity</p>
              <p className="text-slate-400 text-xs mt-1">Click any item to see client details</p>
            </div>
          )}

          {/* Templates quick reference */}
          {templates.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Message Templates</p>
                <Link href="/settings/templates" className="text-xs text-blue-500 hover:text-blue-700">Edit →</Link>
              </div>
              <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                {templates.slice(0, 8).map(t => (
                  <div key={t.id} className="px-4 py-2.5 flex items-center gap-2">
                    <span className="text-sm">{t.type === 'email' ? '✉️' : '💬'}</span>
                    <span className="text-xs text-slate-700 font-medium truncate">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
