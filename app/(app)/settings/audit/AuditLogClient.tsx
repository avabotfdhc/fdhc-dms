'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface AuditEntry {
  id: string
  table_name: string
  action: string
  actor: string | null
  changed_at: string
  row_id: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  [key: string]: unknown
}

interface Props {
  logs: AuditEntry[]
  tables: string[]
  currentPage: number
  totalPages: number
  filters: { table: string; action: string; search: string; from: string; to: string }
}

export default function AuditLogClient({ logs, tables, currentPage, totalPages, filters }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [localFilters, setLocalFilters] = useState(filters)

  function applyFilters() {
    const params = new URLSearchParams()
    if (localFilters.table) params.set('table', localFilters.table)
    if (localFilters.action) params.set('action', localFilters.action)
    if (localFilters.search) params.set('search', localFilters.search)
    if (localFilters.from) params.set('from', localFilters.from)
    if (localFilters.to) params.set('to', localFilters.to)
    router.push(`/settings/audit?${params.toString()}`)
  }

  function buildPageUrl(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    return `/settings/audit?${params.toString()}`
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            value={localFilters.search}
            onChange={e => setLocalFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search table or action..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          />
          <select
            value={localFilters.table}
            onChange={e => setLocalFilters(f => ({ ...f, table: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          >
            <option value="">All Tables</option>
            {tables.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={localFilters.from}
              onChange={e => setLocalFilters(f => ({ ...f, from: e.target.value }))}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              placeholder="From"
            />
            <input
              type="date"
              value={localFilters.to}
              onChange={e => setLocalFilters(f => ({ ...f, to: e.target.value }))}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              placeholder="To"
            />
          </div>
          <button
            onClick={applyFilters}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-50">
          {logs.map(log => {
            const isExpanded = expandedId === log.id
            return (
              <div key={log.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      log.action === 'INSERT' ? 'bg-emerald-500' :
                      log.action === 'UPDATE' ? 'bg-amber-500' :
                      log.action === 'DELETE' ? 'bg-red-500' : 'bg-slate-300'
                    }`} />
                    <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-3">
                      <span className="text-sm font-medium text-slate-800 truncate">{log.table_name}</span>
                      <span className="text-xs font-mono text-slate-500">{log.action}</span>
                      <span className="text-xs text-slate-500 truncate">{log.actor || '—'}</span>
                      <span className="text-xs text-slate-400">
                        {log.changed_at
                          ? new Date(log.changed_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 bg-slate-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-600 uppercase tracking-wide">Row ID</p>
                        <p className="text-slate-800 font-mono">{String(log.row_id || '—')}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                      {log.before_data && (
                        <div>
                          <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">Before</p>
                          <pre className="text-xs text-slate-600 bg-white rounded-lg p-3 overflow-auto max-h-48 border border-slate-200">
                            {JSON.stringify(log.before_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.after_data && (
                        <div>
                          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">After</p>
                          <pre className="text-xs text-slate-600 bg-white rounded-lg p-3 overflow-auto max-h-48 border border-slate-200">
                            {JSON.stringify(log.after_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400">No audit log entries found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {currentPage > 1 && (
            <Link
              href={buildPageUrl(currentPage - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={buildPageUrl(currentPage + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
