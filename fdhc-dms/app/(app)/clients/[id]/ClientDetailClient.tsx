'use client'

import QuickActions from '@/components/QuickActions'
import ActivityTimeline from '@/components/ActivityTimeline'
import ClientSequenceEnrollments from '@/components/ClientSequenceEnrollments'
import { useState } from 'react'

interface Props {
  clientId: string
  phone?: string
  email?: string
}

export default function ClientDetailClient({ clientId, phone, email }: Props) {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <h2 className="font-semibold text-slate-900 text-sm mb-3">Quick Actions</h2>
        <QuickActions
          clientId={clientId}
          phone={phone}
          email={email}
          onActivityAdded={() => setRefreshKey(k => k + 1)}
        />
      </div>

      {/* Active Sequences */}
      <ClientSequenceEnrollments clientId={clientId} />

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <ActivityTimeline key={refreshKey} clientId={clientId} />
      </div>
    </>
  )
}
