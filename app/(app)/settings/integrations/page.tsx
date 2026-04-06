import { createClient } from '@/lib/supabase/server'
import IntegrationsClient from './IntegrationsClient'

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()

  const isAdmin = profile?.role === 'admin'

  return <IntegrationsClient isAdmin={isAdmin} />
}
