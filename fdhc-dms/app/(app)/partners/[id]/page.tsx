import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import PartnerDetailClient from './PartnerDetailClient'

const roleBadgeVariant: Record<string, 'info' | 'success' | 'warning' | 'purple' | 'neutral'> = {
  lender: 'info',
  installer: 'success',
  transporter: 'warning',
  manufacturer: 'purple',
  other: 'neutral',
}

export default async function PartnerDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!partner) notFound()

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/partners" className="text-slate-400 hover:text-slate-600 text-sm">&larr; Partners</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">{partner.company_name}</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{partner.company_name}</h1>
          {partner.contact_person && (
            <p className="text-slate-500 text-sm">{partner.contact_person}</p>
          )}
        </div>
        <Badge text={partner.role || 'other'} variant={roleBadgeVariant[partner.role] || 'neutral'} />
      </div>

      <PartnerDetailClient partner={partner} />
    </div>
  )
}
