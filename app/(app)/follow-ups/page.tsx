import { createClient } from '@/lib/supabase/server'
import FollowUpsClient from './FollowUpsClient'

interface FollowUpRow {
  id: string
  client_id: string
  assigned_to: string
  activity_type: string
  scheduled_at: string
  status: string
  priority: string | null
  notes: string | null
}

interface ClientBasic {
  id: string
  first_name: string
  last_name: string
}

export default async function FollowUpsPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  let profile: { id: string; role: string } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()
    profile = data
  }

  // Fetch pending follow-ups
  let query = supabase
    .from('scheduled_follow_ups')
    .select('id, client_id, assigned_to, activity_type, scheduled_at, status, priority, notes')
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true })
    .limit(200)

  // Non-admin users only see their own follow-ups
  if (profile && profile.role !== 'admin' && profile.role !== 'manager') {
    query = query.eq('assigned_to', profile.id)
  }

  const { data: followUps } = await query

  // Fetch client names for all follow-ups
  const clientIds = [...new Set((followUps || []).map((f: FollowUpRow) => f.client_id).filter(Boolean))]
  let clientMap: Record<string, ClientBasic> = {}
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .in('id', clientIds)
    if (clients) {
      for (const c of clients) {
        clientMap[c.id] = c as ClientBasic
      }
    }
  }

  // Group follow-ups
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const dayAfterStart = new Date(todayStart)
  dayAfterStart.setDate(dayAfterStart.getDate() + 2)

  const groups: {
    overdue: FollowUpRow[]
    today: FollowUpRow[]
    tomorrow: FollowUpRow[]
    later: FollowUpRow[]
  } = { overdue: [], today: [], tomorrow: [], later: [] }

  for (const fu of (followUps || []) as FollowUpRow[]) {
    const d = new Date(fu.scheduled_at)
    if (d < todayStart) {
      groups.overdue.push(fu)
    } else if (d < tomorrowStart) {
      groups.today.push(fu)
    } else if (d < dayAfterStart) {
      groups.tomorrow.push(fu)
    } else {
      groups.later.push(fu)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Follow-ups</h1>
        <p className="text-slate-500 text-sm">{(followUps || []).length} pending</p>
      </div>

      <FollowUpsClient groups={groups} clientMap={clientMap} />
    </div>
  )
}
