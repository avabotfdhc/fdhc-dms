import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function formatCurrency(val: number) {
  const abs = Math.abs(val)
  const formatted = `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return val < 0 ? `(${formatted})` : formatted
}

type Period = 'month' | 'quarter' | 'year' | 'all'

function getDateRange(period: Period): { start: string; end: string } | null {
  if (period === 'all') return null
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (period === 'month') {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
  }
  if (period === 'quarter') {
    const qStart = Math.floor(month / 3) * 3
    const start = new Date(year, qStart, 1)
    const end = new Date(year, qStart + 3, 0)
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
  }
  // year
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: periodParam } = await searchParams
  const period = (periodParam as Period) || 'all'
  const supabase = await createClient()

  // Fetch accounts grouped by type
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('code')

  const revenueAccounts = (accounts || []).filter(a => a.type === 'Revenue')
  const cogsAccounts = (accounts || []).filter(a => a.type === 'COGS')
  const expenseAccounts = (accounts || []).filter(a => a.type === 'Expense')

  // For date-filtered view, query journal lines within period
  const dateRange = getDateRange(period)
  let periodRevenue = 0
  let periodCOGS = 0
  let periodExpenses = 0

  if (dateRange) {
    // Get posted journal entries in the date range
    const { data: entries } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('posted', true)
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)

    if (entries && entries.length > 0) {
      const entryIds = entries.map(e => e.id)
      const { data: lines } = await supabase
        .from('journal_lines')
        .select('account_id, debit, credit')
        .in('journal_entry_id', entryIds)

      if (lines) {
        const revenueIds = new Set(revenueAccounts.map(a => a.id))
        const cogsIds = new Set(cogsAccounts.map(a => a.id))
        const expenseIds = new Set(expenseAccounts.map(a => a.id))

        for (const line of lines) {
          const net = (line.credit || 0) - (line.debit || 0)
          if (revenueIds.has(line.account_id)) periodRevenue += net
          if (cogsIds.has(line.account_id)) periodCOGS += (line.debit || 0) - (line.credit || 0)
          if (expenseIds.has(line.account_id)) periodExpenses += (line.debit || 0) - (line.credit || 0)
        }
      }
    }
  } else {
    // Use running balances for all time
    periodRevenue = revenueAccounts.reduce((s, a) => s + Math.abs(a.balance || 0), 0)
    periodCOGS = cogsAccounts.reduce((s, a) => s + Math.abs(a.balance || 0), 0)
    periodExpenses = expenseAccounts.reduce((s, a) => s + Math.abs(a.balance || 0), 0)
  }

  const grossProfit = periodRevenue - periodCOGS
  const netIncome = grossProfit - periodExpenses

  // Check for ledger entries summary
  const { data: ledgerSummary } = await supabase
    .from('ledger_entries')
    .select('entry_type, amount')

  const ledgerByType: Record<string, number> = {}
  if (ledgerSummary) {
    for (const entry of ledgerSummary) {
      ledgerByType[entry.entry_type] = (ledgerByType[entry.entry_type] || 0) + (entry.amount || 0)
    }
  }

  const periods: { value: Period; label: string }[] = [
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profit & Loss</h1>
          <p className="text-slate-500 text-sm">Income statement</p>
        </div>
        <Link
          href="/accounting"
          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Accounts
        </Link>
      </div>

      {/* Period filter */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {periods.map(p => (
          <Link
            key={p.value}
            href={p.value === 'all' ? '/accounting/reports' : `/accounting/reports?period=${p.value}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              period === p.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Revenue */}
      <div className="mb-6">
        <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-2">Revenue</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
          {revenueAccounts.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">No revenue accounts</div>
          ) : (
            revenueAccounts.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">{a.code}</span>
                  <span className="text-sm text-slate-700">{a.name}</span>
                </div>
                <span className="text-sm font-semibold text-green-700 tabular-nums">
                  {formatCurrency(Math.abs(a.balance || 0))}
                </span>
              </div>
            ))
          )}
          <div className="px-4 py-3 flex items-center justify-between bg-green-50">
            <span className="text-sm font-semibold text-green-800">Total Revenue</span>
            <span className="text-sm font-bold text-green-800 tabular-nums">{formatCurrency(periodRevenue)}</span>
          </div>
        </div>
      </div>

      {/* COGS */}
      <div className="mb-6">
        <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-2">Cost of Goods Sold</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
          {cogsAccounts.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">No COGS accounts</div>
          ) : (
            cogsAccounts.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">{a.code}</span>
                  <span className="text-sm text-slate-700">{a.name}</span>
                </div>
                <span className="text-sm font-semibold text-orange-700 tabular-nums">
                  {formatCurrency(Math.abs(a.balance || 0))}
                </span>
              </div>
            ))
          )}
          <div className="px-4 py-3 flex items-center justify-between bg-orange-50">
            <span className="text-sm font-semibold text-orange-800">Total COGS</span>
            <span className="text-sm font-bold text-orange-800 tabular-nums">{formatCurrency(periodCOGS)}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100 mb-6">
        <div className="px-4 py-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Gross Profit</span>
          <span className={`text-lg font-bold tabular-nums ${grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(grossProfit)}
          </span>
        </div>
        {expenseAccounts.length > 0 && (
          <>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Expenses</span>
              <span className="text-sm font-semibold text-red-700 tabular-nums">{formatCurrency(periodExpenses)}</span>
            </div>
            <div className="px-4 py-4 flex items-center justify-between bg-slate-50">
              <span className="text-sm font-bold text-slate-900">Net Income</span>
              <span className={`text-lg font-bold tabular-nums ${netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(netIncome)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Ledger entries summary */}
      {Object.keys(ledgerByType).length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-2">Ledger Entries by Type</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
            {Object.entries(ledgerByType).map(([type, amount]) => (
              <div key={type} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-slate-700 font-mono">{type}</span>
                <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
