import { createClient } from '@/lib/supabase/server'
import OrdersClient from './OrdersClient'

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: orders } = await supabase
    .from('manufacturer_orders')
    .select('*, clients(first_name, last_name), profiles(name, username)')
    .order('created_at', { ascending: false })

  const { data: partners } = await supabase
    .from('partners')
    .select('id, company_name')
    .eq('role', 'manufacturer')
    .order('company_name')

  return <OrdersClient orders={orders || []} manufacturers={partners || []} />
}
