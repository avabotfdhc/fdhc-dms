import { createClient } from '@/lib/supabase/server'

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
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
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

      {/* Team */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">Team Members</h2>
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

      {/* System settings */}
      {settings?.data && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">System Settings</h2>
          <pre className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 overflow-auto max-h-48">
            {JSON.stringify(settings.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
