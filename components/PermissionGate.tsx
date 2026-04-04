'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { hasPermission, type Permission, type PermissionProfile } from '@/lib/permissions'

interface PermissionGateProps {
  requires: Permission
  children: ReactNode
  fallback?: ReactNode
}

export default function PermissionGate({
  requires,
  children,
  fallback = null,
}: PermissionGateProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    async function check() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setAllowed(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, can_view_all_clients, can_edit_deals, can_approve_agreements, can_manage_users, can_view_accounting, can_delete_records')
          .eq('id', user.id)
          .single()

        if (!profile) {
          setAllowed(false)
          return
        }

        setAllowed(hasPermission(profile as PermissionProfile, requires))
      } catch {
        setAllowed(false)
      }
    }
    check()
  }, [requires])

  // Still loading
  if (allowed === null) return null

  return allowed ? <>{children}</> : <>{fallback}</>
}
