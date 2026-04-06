'use client'

import { useState, lazy, Suspense, type ComponentType } from 'react'
import type { WidgetConfig } from './widget-registry'
import DashboardCustomizer from './DashboardCustomizer'

const widgetComponents: Record<string, ComponentType> = {
  'stats-overview': lazy(() => import('./widgets/StatsOverview')),
  'my-follow-ups': lazy(() => import('./widgets/MyFollowUps')),
  'my-deals': lazy(() => import('./widgets/MyDeals')),
  'recent-activity': lazy(() => import('./widgets/RecentActivity')),
  'pipeline-summary': lazy(() => import('./widgets/PipelineSummary')),
  'inventory-snapshot': lazy(() => import('./widgets/InventorySnapshot')),
  'my-clients': lazy(() => import('./widgets/MyClients')),
  'team-leaderboard': lazy(() => import('./widgets/TeamLeaderboard')),
  'my-projects': lazy(() => import('./widgets/MyProjects')),
}

interface DashboardGridProps {
  widgets: WidgetConfig[]
  onLayoutChange: (widgets: WidgetConfig[]) => void
}

function WidgetSkeleton() {
  return <div className="h-48 rounded-xl bg-slate-100 animate-pulse" />
}

export default function DashboardGrid({ widgets, onLayoutChange }: DashboardGridProps) {
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const activeWidgets = widgets.filter((w) => w.enabled)

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Factory Direct Homes Center</p>
        </div>
        <button
          onClick={() => setCustomizerOpen(true)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Customize
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeWidgets.map((widget) => {
          const Component = widgetComponents[widget.id]
          if (!Component) return null

          return (
            <div
              key={widget.id}
              className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${
                widget.id === 'stats-overview' ? 'md:col-span-2 xl:col-span-3' : ''
              }`}
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 text-sm">{widget.label}</h2>
              </div>
              <div className="p-4">
                <Suspense fallback={<WidgetSkeleton />}>
                  <Component />
                </Suspense>
              </div>
            </div>
          )
        })}
      </div>

      {activeWidgets.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <p className="text-slate-500 text-sm mb-2">No widgets enabled.</p>
          <button
            onClick={() => setCustomizerOpen(true)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Customize your dashboard
          </button>
        </div>
      )}

      <DashboardCustomizer
        isOpen={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        widgets={widgets}
        onSave={onLayoutChange}
      />
    </>
  )
}
