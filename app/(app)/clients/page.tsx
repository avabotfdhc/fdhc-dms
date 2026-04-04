import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface SearchParams {
  search?: string
  status?: string
  page?: string
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()
  const search = searchParams.search || ''
  const status = searchParams.status || ''
  const page = parseInt(searchParams.page || '1')
  const pageSize = 25
  const from = (page - 1) * pageSize

  let query = supabase
    .from('clients')
    .select('id, first_name, last_name, email, phone, status, source, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data: clients, count } = await query

  const totalPages = Math.ceil((count || 0) / pageSize)

  const statusColors: Record<string, string> = {
    lead: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-600',
    lost: 'bg-red-100 text-red-800',
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm">{count?.toLocaleString()} total</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/clients/pipeline"
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
          >
            Pipeline
          </Link>
          <Link
            href="/clients/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New
          </Link>
        </div>
      </div>

      {/* Search & filter */}
      <form className="flex gap-2 mb-4">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search name, email, phone…"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          name="status"
          defaultValue={status}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="lead">Lead</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="lost">Lost</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
        >
          Search
        </button>
      </form>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-50">
          {clients?.map(client => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                {(client.first_name?.[0] || '') + (client.last_name?.[0] || '')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">
                  {client.first_name} {client.last_name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {client.email || client.phone || 'No contact info'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {client.status && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[client.status] || 'bg-slate-100 text-slate-600'}`}>
                    {client.status}
                  </span>
                )}
                {client.source && (
                  <span className="text-xs text-slate-400">{client.source}</span>
                )}
              </div>
            </Link>
          ))}
          {(!clients || clients.length === 0) && (
            <p className="px-4 py-8 text-center text-slate-400 text-sm">No clients found</p>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {page > 1 && (
            <Link
              href={`/clients?page=${page - 1}&search=${search}&status=${status}`}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              ← Prev
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-slate-600">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/clients?page=${page + 1}&search=${search}&status=${status}`}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
