import { createClient } from '@/lib/supabase/server'

async function getStats() {
  const supabase = await createClient()
  const [
    { count: clientCount },
    { count: modelCount },
    { count: inventoryCount },
    { count: dealCount },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('models').select('*', { count: 'exact', head: true }),
    supabase.from('inventory').select('*', { count: 'exact', head: true }),
    supabase.from('agreements').select('*', { count: 'exact', head: true }),
    supabase
      .from('audit_log')
      .select('table_name, action, changed_at, actor')
      .order('changed_at', { ascending: false })
      .limit(10),
  ])
  return { clientCount, modelCount, inventoryCount, dealCount, recentActivity }
}

export default async function DashboardPage() {
  const { clientCount, modelCount, inventoryCount, dealCount, recentActivity } = await getStats()

  const stats = [
    { label: 'Total Clients', value: clientCount?.toLocaleString() ?? '—', color: 'bg-blue-500', icon: '👥' },
    { label: 'Active Deals', value: dealCount?.toLocaleString() ?? '—', color: 'bg-emerald-500', icon: '📋' },
    { label: 'Models', value: modelCount?.toLocaleString() ?? '—', color: 'bg-purple-500', icon: '🏠' },
    { label: 'In Inventory', value: inventoryCount?.toLocaleString() ?? '—', color: 'bg-amber-500', icon: '📦' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Factory Direct Homes Center</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className={`inline-flex items-center justify-center w-10 h-10 ${stat.color} rounded-lg text-white text-lg mb-3`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">Recent Activity</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {recentActivity?.map((item, i) => (
            <div key={i} className="px-4 py-3 flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">
                  <span className="font-medium capitalize">{item.action}</span>
                  {' '}<span className="text-slate-500">{item.table_name}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {item.actor || 'System'} · {new Date(item.changed_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {(!recentActivity || recentActivity.length === 0) && (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}
