import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function formatCurrency(val: number | null) {
  if (val == null) return '$0.00'
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('journal_entries')
    .select('*, journal_lines(debit, credit)')
    .order('date', { ascending: false })

  if (filter === 'posted') {
    query = query.eq('posted', true)
  } else if (filter === 'unposted') {
    query = query.eq('posted', false)
  }

  const { data: entries } = await query

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Journal Entries</h1>
          <p className="text-slate-500 text-sm">{entries?.length || 0} entries</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/accounting"
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Accounts
          </Link>
          <Link
            href="/accounting/journal/new"
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Entry
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { value: '', label: 'All' },
          { value: 'posted', label: 'Posted' },
          { value: 'unposted', label: 'Drafts' },
        ].map(f => (
          <Link
            key={f.value}
            href={f.value ? `/accounting/journal?filter=${f.value}` : '/accounting/journal'}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              (filter || '') === f.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!entries || entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400 text-sm">
          No journal entries found
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
          {entries.map(entry => {
            const lines = (entry.journal_lines as Array<{ debit: number; credit: number }>) || []
            const totalAmount = lines.reduce((sum, l) => sum + (l.debit || 0), 0)
            return (
              <div key={entry.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 text-sm">{entry.reference || 'No Reference'}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.posted
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {entry.posted ? 'Posted' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(totalAmount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {entry.date ? new Date(entry.date + 'T00:00:00').toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
