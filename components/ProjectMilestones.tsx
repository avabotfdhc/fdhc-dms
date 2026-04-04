'use client'

import { useState } from 'react'

export interface MilestoneTask {
  id: number
  name: string
  completed: boolean
  date: string
  notes: string
  estimated_date?: string
}

interface ProjectMilestonesProps {
  tasks: MilestoneTask[]
  onUpdate: (tasks: MilestoneTask[]) => void
}

const DEFAULT_MILESTONES: MilestoneTask[] = [
  { id: 1, name: 'Deposit Received', completed: false, date: '', notes: '' },
  { id: 2, name: 'PO Sent to Factory', completed: false, date: '', notes: '' },
  { id: 3, name: 'In Production', completed: false, date: '', notes: '' },
  { id: 4, name: 'Ready for Delivery', completed: false, date: '', notes: '' },
  { id: 5, name: 'Site Prep Complete', completed: false, date: '', notes: '' },
  { id: 6, name: 'Transport Scheduled', completed: false, date: '', notes: '' },
  { id: 7, name: 'Delivered to Site', completed: false, date: '', notes: '' },
  { id: 8, name: 'Setup & Installation', completed: false, date: '', notes: '' },
  { id: 9, name: 'HUD Inspection', completed: false, date: '', notes: '' },
  { id: 10, name: 'Client Walkthrough', completed: false, date: '', notes: '' },
  { id: 11, name: 'Certificate of Occupancy', completed: false, date: '', notes: '' },
  { id: 12, name: 'Keys Handed Over', completed: false, date: '', notes: '' },
]

export { DEFAULT_MILESTONES }

function getMilestoneStatus(task: MilestoneTask, index: number, tasks: MilestoneTask[]): 'done' | 'current' | 'future' | 'overdue' {
  if (task.completed) return 'done'
  // Check if overdue
  if (task.estimated_date && new Date(task.estimated_date) < new Date()) return 'overdue'
  // Current = first incomplete
  const firstIncomplete = tasks.findIndex(t => !t.completed)
  if (index === firstIncomplete) return 'current'
  return 'future'
}

const statusColors: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  done: { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  current: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', text: 'text-amber-700' },
  future: { bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-300', text: 'text-slate-500' },
  overdue: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-700' },
}

export default function ProjectMilestones({ tasks, onUpdate }: ProjectMilestonesProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  function toggleComplete(id: number) {
    const updated = tasks.map(t =>
      t.id === id
        ? { ...t, completed: !t.completed, date: !t.completed ? new Date().toISOString().split('T')[0] : t.date }
        : t
    )
    onUpdate(updated)
  }

  function updateTask(id: number, field: string, value: string) {
    const updated = tasks.map(t =>
      t.id === id ? { ...t, [field]: value } : t
    )
    onUpdate(updated)
  }

  const completedCount = tasks.filter(t => t.completed).length
  const progressPct = Math.round((completedCount / tasks.length) * 100)

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Progress</span>
          <span className="text-sm font-semibold text-slate-900">{progressPct}%</span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">{completedCount} of {tasks.length} milestones complete</p>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {tasks.map((task, index) => {
          const milestoneStatus = getMilestoneStatus(task, index, tasks)
          const colors = statusColors[milestoneStatus]
          const isExpanded = expandedId === task.id

          return (
            <div
              key={task.id}
              className={`rounded-xl border ${colors.border} ${colors.bg} transition-all duration-300`}
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : task.id)}
              >
                {/* Timeline dot & line */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleComplete(task.id) }}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : `border-current ${colors.text}`
                    }`}
                  >
                    {task.completed && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {!task.completed && (
                      <span className="text-xs font-bold">{task.id}</span>
                    )}
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.completed ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>
                    {task.name}
                  </p>
                  {task.date && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.text} ${colors.bg}`}>
                  {milestoneStatus === 'done' ? 'Done' : milestoneStatus === 'current' ? 'Next' : milestoneStatus === 'overdue' ? 'Overdue' : ''}
                </div>

                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-0 ml-10 space-y-3 border-t border-current/10 mt-0">
                  <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-500">Completion Date</label>
                      <input
                        type="date"
                        value={task.date}
                        onChange={(e) => updateTask(task.id, 'date', e.target.value)}
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-500">Estimated Date</label>
                      <input
                        type="date"
                        value={task.estimated_date || ''}
                        onChange={(e) => updateTask(task.id, 'estimated_date', e.target.value)}
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500">Notes</label>
                    <input
                      type="text"
                      value={task.notes}
                      onChange={(e) => updateTask(task.id, 'notes', e.target.value)}
                      placeholder="Add notes..."
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
