import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'

const roleBadgeVariant: Record<string, 'info' | 'success' | 'warning' | 'purple' | 'neutral'> = {
  lender: 'info',
  installer: 'success',
  transporter: 'warning',
  manufacturer: 'purple',
  other: 'neutral',
}

export default async function PartnersPage() {
  const supabase = await createClient()
  const { data: partners } = await supabase
    .from('partners')
    .select('*')
    .order('company_name')

  const grouped: Record<string, typeof partners> = {}
  const roles = ['lender', 'installer', 'transporter', 'manufacturer', 'other']
  roles.forEach(r => { grouped[r] = [] })

  partners?.forEach(p => {
    const role = roles.includes(p.role) ? p.role : 'other'
    grouped[role]!.push(p)
  })

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Partners & Vendors</h1>
          <p className="text-slate-500 text-sm">{partners?.length || 0} partners</p>
        </div>
        <Link
          href="/partners/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Add Partner
        </Link>
      </div>

      {roles.map(role => {
        const items = grouped[role] || []
        if (items.length === 0) return null
        return (
          <div key={role} className="mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 capitalize">
              {role}s ({items.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((p) => (
                <Link
                  key={String(p.id)}
                  href={`/partners/${p.id}`}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-blue-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 text-sm">{String(p.company_name || '—')}</h3>
                    <Badge text={String(p.role || 'other')} variant={roleBadgeVariant[String(p.role)] || 'neutral'} size="sm" />
                  </div>
                  {p.contact_person ? (
                    <p className="text-sm text-slate-600 mb-1">{String(p.contact_person)}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    {p.phone ? <span>{String(p.phone)}</span> : null}
                    {p.email ? <span>{String(p.email)}</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}

      {(!partners || partners.length === 0) && (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm">No partners yet</p>
          <Link href="/partners/new" className="text-blue-600 text-sm font-medium mt-2 inline-block">
            Add your first partner
          </Link>
        </div>
      )}
    </div>
  )
}
