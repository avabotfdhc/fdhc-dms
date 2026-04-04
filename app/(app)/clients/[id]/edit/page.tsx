import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ClientEditFormWrapper from './ClientEditFormWrapper'

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!client) notFound()

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/clients/${params.id}`} className="text-slate-400 hover:text-slate-600 text-sm">
          &larr; Back
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">Edit</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <ClientEditFormWrapper client={client} />
      </div>
    </div>
  )
}
