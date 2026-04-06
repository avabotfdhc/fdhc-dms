'use client'

import { useState, lazy, Suspense, type ComponentType } from 'react'
import Link from 'next/link'
import type { WidgetConfig } from './widget-registry'
import DashboardCustomizer from './DashboardCustomizer'

// Widget components (lazy loaded)
const widgetComponents: Record<string, ComponentType> = {
  'stats-overview':    lazy(() => import('./widgets/StatsOverview')),
  'my-follow-ups':     lazy(() => import('./widgets/MyFollowUps')),
  'my-deals':          lazy(() => import('./widgets/MyDeals')),
  'recent-activity':   lazy(() => import('./widgets/RecentActivity')),
  'pipeline-summary':  lazy(() => import('./widgets/PipelineSummary')),
  'inventory-snapshot':lazy(() => import('./widgets/InventorySnapshot')),
  'my-clients':        lazy(() => import('./widgets/MyClients')),
  'team-leaderboard':  lazy(() => import('./widgets/TeamLeaderboard')),
  'my-projects':       lazy(() => import('./widgets/MyProjects')),
  'calendar':          lazy(() => import('./widgets/CalendarWidget')),
}

// Where each widget's header "View all →" link points
const widgetLinks: Record<string, string> = {
  'stats-overview':     '/clients',
  'my-follow-ups':      '/follow-ups',
  'my-deals':           '/agreements',
  'recent-activity':    '/settings/audit',
  'pipeline-summary':   '/clients/pipeline',
  'inventory-snapshot': '/inventory',
  'my-clients':         '/clients',
  'team-leaderboard':   '/settings/users',
  'my-projects':        '/agreements',
  'calendar':           '/calendar',
}

// Span full width on these widget ids
const fullWidthWidgets = new Set(['stats-overview', 'calendar'])

interface DashboardGridProps {
  widgets: WidgetConfig[]
  onLayoutChange: (widgets: WidgetConfig[]) => void
}

function WidgetSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}

export default function DashboardGrid({ widgets, onLayoutChange }: DashboardGridProps) {
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const activeWidgets = widgets.filter(w => w.enabled)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <>
      {/* ── Page header ────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">{today}</p>
        </div>
        <button
          onClick={() => setCustomizerOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          <span>⚙</span> Customize
        </button>
      </div>

      {/* ── Widget grid ────────────────────────────────── */}
      {activeWidgets.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-slate-500 text-sm mb-2 font-medium">No widgets enabled yet</p>
          <button
            onClick={() => setCustomizerOpen(true)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Customize your dashboard →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeWidgets.map(widget => {
            const Component = widgetComponents[widget.id]
            if (!Component) return null
            const viewAllHref = widgetLinks[widget.id]

            return (
              <div
                key={widget.id}
                className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
                  fullWidthWidgets.has(widget.id) ? 'md:col-span-2 xl:col-span-3' : ''
                }`}
              >
                {/* Widget header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                  <h2 className="font-semibold text-slate-800 text-sm">{widget.label}</h2>
                  {viewAllHref && (
                    <Link
                      href={viewAllHref}
                      className="text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      View all →
                    </Link>
                  )}
                </div>
                {/* Widget body */}
                <div className="p-4">
                  <Suspense fallback={<WidgetSkeleton />}>
                    <Component />
                  </Suspense>
                </div>
              </div>
            )
          })}
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
