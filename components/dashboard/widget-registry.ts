import type { ComponentType } from 'react'

export interface WidgetConfig {
  id: string
  label: string
  description: string
  enabled: boolean
}

export interface WidgetDefinition {
  id: string
  label: string
  description: string
  component: ComponentType
}

export const ALL_WIDGETS: Omit<WidgetDefinition, 'component'>[] = [
  { id: 'stats-overview', label: 'Stats Overview', description: 'KPI cards: clients, deals, models, follow-ups' },
  { id: 'my-follow-ups', label: 'My Follow-Ups', description: 'Today\'s pending follow-ups assigned to you' },
  { id: 'my-deals', label: 'My Deals', description: 'Your active deals with status and amount' },
  { id: 'recent-activity', label: 'Recent Activity', description: 'Last 10 audit log entries' },
  { id: 'pipeline-summary', label: 'Pipeline Summary', description: 'Client count per pipeline status' },
  { id: 'inventory-snapshot', label: 'Inventory Snapshot', description: 'Units by status: on lot, reserved, incoming, sold' },
  { id: 'my-clients', label: 'My Clients', description: 'Clients needing attention (no contact in 7+ days)' },
  { id: 'team-leaderboard', label: 'Team Leaderboard', description: 'Sales rep ranking by deals and revenue' },
  { id: 'my-projects', label: 'My Projects', description: 'Active delivery projects with progress' },
]

export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'stats-overview', label: 'Stats Overview', description: 'KPI cards: clients, deals, models, follow-ups', enabled: true },
  { id: 'my-follow-ups', label: 'My Follow-Ups', description: 'Today\'s pending follow-ups assigned to you', enabled: true },
  { id: 'my-deals', label: 'My Deals', description: 'Your active deals with status and amount', enabled: true },
  { id: 'recent-activity', label: 'Recent Activity', description: 'Last 10 audit log entries', enabled: true },
  { id: 'pipeline-summary', label: 'Pipeline Summary', description: 'Client count per pipeline status', enabled: false },
  { id: 'inventory-snapshot', label: 'Inventory Snapshot', description: 'Units by status: on lot, reserved, incoming, sold', enabled: false },
  { id: 'my-clients', label: 'My Clients', description: 'Clients needing attention (no contact in 7+ days)', enabled: false },
  { id: 'team-leaderboard', label: 'Team Leaderboard', description: 'Sales rep ranking by deals and revenue', enabled: false },
  { id: 'my-projects', label: 'My Projects', description: 'Active delivery projects with progress', enabled: false },
]

export function getWidgetComponent(id: string): ComponentType | null {
  // Dynamic imports handled at the grid level to keep this file free of React
  return null
}
