import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function fmt$(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US')
}
function pct(num: number, den: number) {
  if (!den) return '0%'
  return Math.round((num / den) * 100) + '%'
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period = 'month' } = await searchParams
  const supabase = await createClient()

  // Date range
  const now = new Date()
  const periodStart = period === 'week'
    ? new Date(now.getTime() - 7 * 86400000).toISOString()
    : period === 'month'
    ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    : period === 'quarter'
    ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString()
    : new Date(now.getFullYear(), 0, 1).toISOString()

  const prevStart = period === 'week'
    ? new Date(now.getTime() - 14 * 86400000).toISOString()
    : period === 'month'
    ? new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    : period === 'quarter'
    ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1).toISOString()
    : new Date(now.getFullYear() - 1, 0, 1).toISOString()

  // Parallel data fetches
  const [
    { count: totalLeads },
    { count: periodLeads },
    { count: prevLeads },
    { count: totalDeals },
    { count: periodDeals },
    { data: allClients },
    { data: allDeals },
    { data: reps },
    { data: followUps },
    { data: recentDeals },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', periodStart),
    supabase.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', prevStart).lt('created_at', periodStart),
    supabase.from('agreements').select('*', { count: 'exact', head: true }),
    supabase.from('agreements').select('*', { count: 'exact', head: true }).gte('created_at', periodStart),
    supabase.from('clients').select('status, source, land_status, contact_attempts, created_at, assigned_to').gte('created_at', periodStart),
    supabase.from('agreements').select('financials, status, salesperson_id, created_at').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, name, username').eq('role', 'user').eq('is_active', true),
    supabase.from('follow_ups').select('status, assigned_to, created_at').gte('created_at', periodStart),
    supabase.from('agreements')
      .select('id, deal_number, status, financials, created_at, clients(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  // Pipeline funnel
  const clients = allClients || []
  const statusCounts = {
    lead: clients.filter(c => c.status === 'lead').length,
    active: clients.filter(c => c.status === 'active').length,
    closed: clients.filter(c => c.status === 'closed' || c.status === 'lost').length,
  }

  // Revenue calculations
  const deals = allDeals || []
  const periodDealsList = deals.filter(d => d.created_at >= periodStart)
  const periodRevenue = periodDealsList
    .filter(d => d.status === 'closed' || d.status === 'active')
    .reduce((sum, d) => sum + (Number((d.financials as any)?.sale_price) || 0), 0)

  const totalRevenue = deals
    .filter(d => d.status === 'closed' || d.status === 'active')
    .reduce((sum, d) => sum + (Number((d.financials as any)?.sale_price) || 0), 0)

  const avgDealSize = periodDealsList.length > 0 ? periodRevenue / periodDealsList.length : 0

  // Lead source breakdown
  const sourceMap: Record<string, number> = {}
  clients.forEach(c => {
    const s = c.source || 'unknown'
    sourceMap[s] = (sourceMap[s] || 0) + 1
  })
  const sources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const totalSourced = sources.reduce((s, [, n]) => s + n, 0)

  // Land status breakdown
  const landMap: Record<string, number> = {}
  clients.forEach(c => {
    const l = c.land_status || 'unknown'
    landMap[l] = (landMap[l] || 0) + 1
  })

  // Rep performance
  const repMap: Record<string, { leads: number; deals: number; revenue: number; followUps: number }> = {}
  ;(reps || []).forEach(r => {
    repMap[r.id] = { leads: 0, deals: 0, revenue: 0, followUps: 0 }
  })
  clients.forEach(c => {
    if (c.assigned_to && repMap[c.assigned_to]) repMap[c.assigned_to].leads++
  })
  periodDealsList.forEach(d => {
    if (d.salesperson_id && repMap[d.salesperson_id]) {
      repMap[d.salesperson_id].deals++
      repMap[d.salesperson_id].revenue += Number((d.financials as any)?.sale_price) || 0
    }
  })
  ;(followUps || []).forEach(f => {
    if (f.assigned_to && repMap[f.assigned_to]) repMap[f.assigned_to].followUps++
  })

  const repPerf = (reps || [])
    .map(r => ({ ...r, ...repMap[r.id] || { leads: 0, deals: 0, revenue: 0, followUps: 0 } }))
    .sort((a, b) => b.revenue - a.revenue)

  // Follow-up stats
  const fuList = followUps || []
  const fuCompleted = fuList.filter(f => f.status === 'completed').length
  const fuResponseRate = fuList.length > 0 ? Math.round((fuCompleted / fuList.length) * 100) : 0

  // Conversion funnel
  const funnelSteps = [
    { label: 'New Leads', count: periodLeads || 0, color: 'bg-blue-500' },
    { label: 'Contacted', count: clients.filter(c => (c.contact_attempts || 0) > 0).length, color: 'bg-indigo-500' },
    { label: 'Active', count: statusCounts.active, color: 'bg-purple-500' },
    { label: 'Deals Created', count: periodDeals || 0, color: 'bg-emerald-500' },
  ]
  const funnelMax = funnelSteps[0].count || 1

  // MoM change
  const leadsChange = prevLeads && prevLeads > 0
    ? Math.round(((( periodLeads || 0) - prevLeads) / prevLeads) * 100)
    : null

  const periods = [
    { value: 'week', label: '7 Days' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'year', label: 'Year' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-400 text-sm mt-0.5">Sales performance, pipeline, and rep metrics</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {periods.map(p => (
            <Link key={p.value} href={`/reports?period=${p.value}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'New Leads',
            value: (periodLeads || 0).toLocaleString(),
            sub: leadsChange !== null ? `${leadsChange > 0 ? '+' : ''}${leadsChange}% vs prior` : `${(totalLeads || 0).toLocaleString()} total`,
            positive: leadsChange === null || leadsChange >= 0,
            icon: '👥', bg: 'bg-blue-50', iconBg: 'bg-blue-500',
          },
          {
            label: 'Deals Created',
            value: (periodDeals || 0).toLocaleString(),
            sub: pct(periodDeals || 0, periodLeads || 1) + ' close rate',
            positive: true,
            icon: '📋', bg: 'bg-emerald-50', iconBg: 'bg-emerald-500',
          },
          {
            label: 'Revenue',
            value: fmt$(periodRevenue),
            sub: fmt$(avgDealSize) + ' avg deal size',
            positive: true,
            icon: '💰', bg: 'bg-purple-50', iconBg: 'bg-purple-500',
          },
          {
            label: 'Follow-up Rate',
            value: fuResponseRate + '%',
            sub: `${fuCompleted} of ${fuList.length} completed`,
            positive: fuResponseRate >= 50,
            icon: '🔔', bg: 'bg-amber-50', iconBg: 'bg-amber-500',
          },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-2xl border border-white p-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 ${card.iconBg} rounded-lg flex items-center justify-center text-base text-white shadow-sm`}>
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{card.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">{card.label}</p>
            <p className={`text-xs mt-0.5 ${card.positive ? 'text-emerald-600' : 'text-red-500'}`}>{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-4">Conversion Funnel</h2>
          <div className="space-y-3">
            {funnelSteps.map((step, i) => (
              <div key={step.label}>
                <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>{step.label}</span>
                  <span className="font-bold text-slate-900">{step.count.toLocaleString()}</span>
                </div>
                <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${step.color} rounded-lg flex items-center px-3 transition-all`}
                    style={{ width: `${Math.max((step.count / funnelMax) * 100, 4)}%` }}
                  >
                    {i > 0 && funnelSteps[i - 1].count > 0 && (
                      <span className="text-white text-xs font-bold ml-auto whitespace-nowrap">
                        {pct(step.count, funnelSteps[i - 1].count)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Sources */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-4">Lead Sources</h2>
          {sources.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No leads in this period</p>
          ) : (
            <div className="space-y-3">
              {sources.map(([src, count]) => (
                <div key={src}>
                  <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                    <span className="capitalize">{src.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-slate-900">{count} <span className="text-slate-400 font-normal">({pct(count, totalSourced)})</span></span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: pct(count, totalSourced) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Rep Performance */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Rep Performance</h2>
            <Link href="/settings/users" className="text-xs text-blue-500 hover:text-blue-700">Manage →</Link>
          </div>
          {repPerf.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center px-4">No reps configured</p>
          ) : (
            <div className="divide-y divide-slate-50">
              <div className="grid grid-cols-4 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <div>Rep</div>
                <div className="text-center">Leads</div>
                <div className="text-center">Deals</div>
                <div className="text-right">Revenue</div>
              </div>
              {repPerf.map((rep, i) => (
                <div key={rep.id} className="grid grid-cols-4 px-4 py-3 items-center hover:bg-slate-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-400 w-4 shrink-0">#{i + 1}</span>
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                      {(rep.name || rep.username || '?')[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-800 truncate">{rep.name || rep.username}</span>
                  </div>
                  <div className="text-center text-sm text-slate-700 font-medium">{rep.leads}</div>
                  <div className="text-center text-sm text-slate-700 font-medium">{rep.deals}</div>
                  <div className="text-right text-sm font-bold text-emerald-700">{rep.revenue > 0 ? fmt$(rep.revenue) : '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Land Status */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-4">Land Status Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(landMap).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
              const colors: Record<string, string> = {
                owns_land: 'bg-emerald-500',
                buying_land: 'bg-blue-500',
                renting_lot: 'bg-purple-500',
                needs_land: 'bg-amber-500',
                unknown: 'bg-slate-400',
              }
              const labels: Record<string, string> = {
                owns_land: 'Owns Land',
                buying_land: 'Buying Land',
                renting_lot: 'Renting Lot',
                needs_land: 'Needs Land',
                unknown: 'Unknown',
              }
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                    <span>{labels[status] || status}</span>
                    <span className="font-bold text-slate-900">{count} ({pct(count, totalSourced)})</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[status] || 'bg-slate-400'} rounded-full`}
                      style={{ width: pct(count, clients.length || 1) }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Deals */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Recent Deals</h2>
          <Link href="/agreements" className="text-xs text-blue-500 hover:text-blue-700">View all →</Link>
        </div>
        <div className="divide-y divide-slate-50">
          {(recentDeals || []).length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No deals yet</p>
          ) : (recentDeals || []).map(deal => {
            const client = deal.clients as any
            const name = client ? `${client.first_name} ${client.last_name}` : '—'
            const price = Number((deal.financials as any)?.sale_price) || 0
            const statusColors: Record<string, string> = {
              closed: 'bg-emerald-100 text-emerald-800',
              active: 'bg-blue-100 text-blue-800',
              pending: 'bg-amber-100 text-amber-800',
              draft: 'bg-slate-100 text-slate-600',
              cancelled: 'bg-red-100 text-red-700',
            }
            return (
              <Link key={deal.id} href={`/agreements/${deal.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">#{deal.deal_number} · {name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(deal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{price > 0 ? fmt$(price) : '—'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[deal.status] || 'bg-slate-100 text-slate-600'}`}>
                    {deal.status}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
