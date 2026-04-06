import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SettingsEditor from './SettingsEditor'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', user?.email)
    .maybeSingle()

  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, username, role, email, commission_rate, round_robin_active')
    .order('name')

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-24 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm">System configuration</p>
      </div>

      {/* Current user */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Logged In As</h2>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{profile?.name || profile?.full_name || user?.email}</p>
            <p className="text-xs text-slate-500">{user?.email} · <span className="capitalize">{profile?.role || 'Staff'}</span></p>
          </div>
        </div>
      </div>

      {/* Editable dealership info & defaults */}
      <SettingsEditor settingsId={settings?.id || null} settingsData={(settings?.data as Record<string, unknown>) || {}} />

      {/* Team */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Team Members</h2>
          <Link href="/settings/users" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Manage
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {profiles?.map(p => (
            <div key={p.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-medium text-sm">
                  {(p.name || p.username || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.name || p.username}</p>
                  <p className="text-xs text-slate-500">{p.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs capitalize">{p.role}</span>
                {p.commission_rate && (
                  <span className="text-xs text-slate-500">{p.commission_rate}%</span>
                )}
                {p.round_robin_active && (
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">Round Robin</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <Link href="/settings/users" className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-blue-200 hover:shadow-md transition-all text-center">
          <span className="text-2xl mb-1 block">👥</span>
          <p className="text-sm font-medium text-slate-800">Users</p>
          <p className="text-xs text-slate-500">Manage team</p>
        </Link>
        <Link href="/settings/automations" className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-blue-200 hover:shadow-md transition-all text-center">
          <span className="text-2xl mb-1 block">⚡</span>
          <p className="text-sm font-medium text-slate-800">Automations</p>
          <p className="text-xs text-slate-500">Follow-up rules</p>
        </Link>
        <Link href="/settings/sequences" className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-blue-200 hover:shadow-md transition-all text-center">
          <span className="text-2xl mb-1 block">📋</span>
          <p className="text-sm font-medium text-slate-800">Sequences</p>
          <p className="text-xs text-slate-500">Follow-up campaigns</p>
        </Link>
        <Link href="/settings/templates" className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-blue-200 hover:shadow-md transition-all text-center">
          <span className="text-2xl mb-1 block">📝</span>
          <p className="text-sm font-medium text-slate-800">Templates</p>
          <p className="text-xs text-slate-500">Email & SMS templates</p>
        </Link>
        <Link href="/settings/audit" className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-blue-200 hover:shadow-md transition-all text-center">
          <span className="text-2xl mb-1 block">📜</span>
          <p className="text-sm font-medium text-slate-800">Audit Log</p>
          <p className="text-xs text-slate-500">Activity history</p>
        </Link>
        <Link href="/settings/integrations" className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-blue-200 hover:shadow-md transition-all text-center">
          <span className="text-2xl mb-1 block">🔗</span>
          <p className="text-sm font-medium text-slate-800">Integrations</p>
          <p className="text-xs text-slate-500">Lead intake & webhooks</p>
        </Link>
      </div>
    </div>
  )
}
