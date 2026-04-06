import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AuditLogClient from './AuditLogClient'

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { page?: string; table?: string; action?: string; search?: string; from?: string; to?: string }
}) {
  const supabase = await createClient()
  const page = Number(searchParams.page || '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('changed_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (searchParams.table) {
    query = query.eq('table_name', searchParams.table)
  }
  if (searchParams.action) {
    query = query.eq('action', searchParams.action)
  }
  if (searchParams.search) {
    query = query.or(`table_name.ilike.%${searchParams.search}%,action.ilike.%${searchParams.search}%`)
  }
  if (searchParams.from) {
    query = query.gte('changed_at', searchParams.from)
  }
  if (searchParams.to) {
    query = query.lte('changed_at', searchParams.to + 'T23:59:59')
  }

  const { data: logs, count } = await query

  // Get distinct table names for filter
  const { data: tables } = await supabase
    .from('audit_log')
    .select('table_name')
    .limit(100)

  const uniqueTables = [...new Set(tables?.map(t => t.table_name).filter(Boolean) || [])] as string[]
  const totalPages = Math.ceil((count || 0) / pageSize)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-slate-400 hover:text-slate-600 text-sm">&larr; Settings</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">Audit Log</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-slate-500 text-sm">{count?.toLocaleString() || 0} total entries</p>
      </div>

      <AuditLogClient
        logs={logs || []}
        tables={uniqueTables}
        currentPage={page}
        totalPages={totalPages}
        filters={{
          table: searchParams.table || '',
          action: searchParams.action || '',
          search: searchParams.search || '',
          from: searchParams.from || '',
          to: searchParams.to || '',
        }}
      />
    </div>
  )
}
