'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardGrid from './DashboardGrid'
import type { WidgetConfig } from './widget-registry'

interface DashboardShellProps {
  initialWidgets: WidgetConfig[]
  userId: string
}

export default function DashboardShell({ initialWidgets, userId }: DashboardShellProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(initialWidgets)

  const handleLayoutChange = useCallback(
    async (updated: WidgetConfig[]) => {
      setWidgets(updated)

      // Persist to profile.dashboard_layout
      const supabase = createClient()
      await supabase
        .from('profiles')
        .update({ dashboard_layout: updated })
        .eq('id', userId)
    },
    [userId]
  )

  return <DashboardGrid widgets={widgets} onLayoutChange={handleLayoutChange} />
}
