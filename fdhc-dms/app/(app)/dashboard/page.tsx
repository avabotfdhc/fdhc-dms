import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { DEFAULT_LAYOUT, type WidgetConfig } from '@/components/dashboard/widget-registry'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let layout: WidgetConfig[] = DEFAULT_LAYOUT

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('dashboard_layout')
      .eq('id', user.id)
      .single()

    if (profile?.dashboard_layout && Array.isArray(profile.dashboard_layout)) {
      // Merge saved layout with any new widgets that may have been added since last save
      const savedMap = new Map<string, WidgetConfig>()
      for (const w of profile.dashboard_layout as WidgetConfig[]) {
        savedMap.set(w.id, w)
      }

      // Keep saved order for known widgets, append new ones at the end as disabled
      const merged: WidgetConfig[] = []
      const seen = new Set<string>()

      for (const w of profile.dashboard_layout as WidgetConfig[]) {
        const def = DEFAULT_LAYOUT.find((d) => d.id === w.id)
        if (def) {
          merged.push({ ...def, enabled: w.enabled })
          seen.add(w.id)
        }
      }

      for (const def of DEFAULT_LAYOUT) {
        if (!seen.has(def.id)) {
          merged.push({ ...def, enabled: false })
        }
      }

      layout = merged
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <DashboardShell initialWidgets={layout} userId={user?.id ?? ''} />
    </div>
  )
}
