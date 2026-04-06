import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const typeColors: Record<string, string> = {
  Asset: 'bg-blue-100 text-blue-800',
  Revenue: 'bg-green-100 text-green-800',
  COGS: 'bg-orange-100 text-orange-800',
  Expense: 'bg-red-100 text-red-800',
  Liability: 'bg-purple-100 text-purple-800',
}

const typeOrder = ['Asset', 'Liability', 'Revenue', 'COGS', 'Expense']

function formatCurrency(val: number | null) {
  if (val == null) return '$0.00'
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function AccountingPage() {
  const supabase = await createClient()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('code', { ascending: true })

  // Group by type
  const grouped: Record<string, typeof accounts> = {}
  for (const type of typeOrder) {
    const items = (accounts || []).filter(a => a.type === type)
    if (items.length > 0) {
      grouped[type] = items
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chart of Accounts</h1>
          <p className="text-slate-500 text-sm">{accounts?.length || 0} accounts</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/accounting/journal"
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Journal
          </Link>
          <Link
            href="/accounting/reports"
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Reports
          </Link>
          <Link
            href="/accounting/accounts/new"
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Add Account
          </Link>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400 text-sm">
          No accounts yet. Add your first account to get started.
        </div>
      ) : (
        <div className="space-y-6">
          {typeOrder.map(type => {
            const items = grouped[type]
            if (!items) return null
            const total = items.reduce((sum, a) => sum + (a.balance || 0), 0)

            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{type}s</h2>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(total)}</span>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
                  {items.map(account => (
                    <div key={account.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-500 w-12">{account.code}</span>
                        <span className="text-sm font-medium text-slate-900">{account.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[account.type] || 'bg-slate-100 text-slate-600'}`}>
                          {account.type}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(account.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
