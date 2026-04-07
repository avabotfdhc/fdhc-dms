import { createClient } from '@/lib/supabase/server'
import CommunicationsClient from './CommunicationsClient'

export default async function CommunicationsPage() {
  const supabase = await createClient()

  // Get recent interactions across all clients (from follow_ups table)
  const { data: recent } = await supabase
    .from('scheduled_follow_ups')
    .select('*, clients(id, first_name, last_name, phone, email, assigned_to)')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: templates } = await supabase
    .from('message_templates')
    .select('id, name, type, body')
    .order('name')

  return <CommunicationsClient items={recent || []} templates={templates || []} />
}
