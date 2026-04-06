'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import SaveIndicator from '@/components/ui/SaveIndicator'
import Link from 'next/link'

interface Profile {
  id: string
  name: string | null
  username: string | null
  email: string
  role: string
  commission_rate: number | null
  round_robin_active: boolean
  is_active: boolean
  can_desk: boolean
  can_manage_inventory: boolean
  can_view_reports: boolean
  [key: string]: unknown
}

const roleOptions = ['admin', 'manager', 'sales_rep', 'finance', 'service', 'viewer']

export default function UsersPage() {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')

  // Invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('sales_rep')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('name')
      if (data) setProfiles(data as Profile[])
      setLoading(false)
    }
    load()
  }, [supabase])

  const updateProfile = useCallback(async (id: string, field: string, value: unknown) => {
    setSaveStatus('saving')
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    try {
      await supabase.from('profiles').update({ [field]: value }).eq('id', id)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [supabase])

  async function handleInvite() {
    if (!inviteEmail) return
    setInviting(true)
    try {
      // Create profile entry (simplified — actual auth invite would use admin API)
      await supabase.from('profiles').insert({
        email: inviteEmail,
        role: inviteRole,
        is_active: true,
        round_robin_active: false,
      })
      const { data } = await supabase.from('profiles').select('*').order('name')
      if (data) setProfiles(data as Profile[])
      setInviteEmail('')
    } finally {
      setInviting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-slate-400 hover:text-slate-600 text-sm">&larr; Settings</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">Users</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm">{profiles.length} users</p>
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      {/* Invite */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Invite User</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="Email address"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          >
            {roleOptions.map(r => (
              <option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </div>
      </div>

      {/* User list */}
      <div className="space-y-3">
        {profiles.map(p => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-medium text-sm">
                {(p.name || p.username || p.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{p.name || p.username || p.email}</p>
                <p className="text-xs text-slate-500 truncate">{p.email}</p>
              </div>
              {/* Active toggle */}
              <button
                type="button"
                onClick={() => updateProfile(p.id, 'is_active', !p.is_active)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  p.is_active !== false
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {p.is_active !== false ? 'Active' : 'Inactive'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Role */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">Role</label>
                <select
                  value={p.role || 'sales_rep'}
                  onChange={e => updateProfile(p.id, 'role', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {roleOptions.map(r => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>

              {/* Commission */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">Commission %</label>
                <input
                  type="number"
                  value={p.commission_rate || ''}
                  onChange={e => updateProfile(p.id, 'commission_rate', e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="0"
                />
              </div>

              {/* Round Robin */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">Round Robin</label>
                <button
                  type="button"
                  onClick={() => updateProfile(p.id, 'round_robin_active', !p.round_robin_active)}
                  className={`w-full rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                    p.round_robin_active
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {p.round_robin_active ? 'On' : 'Off'}
                </button>
              </div>

              {/* Permissions */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">Permissions</label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { key: 'can_desk', label: 'Desk' },
                    { key: 'can_manage_inventory', label: 'Inv' },
                    { key: 'can_view_reports', label: 'Rpt' },
                  ].map(perm => (
                    <button
                      key={perm.key}
                      type="button"
                      onClick={() => updateProfile(p.id, perm.key, !p[perm.key])}
                      className={`px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                        p[perm.key]
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {perm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
