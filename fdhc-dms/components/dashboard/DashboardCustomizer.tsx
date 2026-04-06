'use client'

import { useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import type { WidgetConfig } from './widget-registry'

interface DashboardCustomizerProps {
  isOpen: boolean
  onClose: () => void
  widgets: WidgetConfig[]
  onSave: (widgets: WidgetConfig[]) => void
}

export default function DashboardCustomizer({
  isOpen,
  onClose,
  widgets,
  onSave,
}: DashboardCustomizerProps) {
  const [draft, setDraft] = useState<WidgetConfig[]>([])
  const [saving, setSaving] = useState(false)

  // Re-sync draft when modal opens
  const handleOpen = useCallback(() => {
    setDraft(widgets.map((w) => ({ ...w })))
  }, [widgets])

  // We trigger sync on each render when open transitions
  if (isOpen && draft.length === 0 && widgets.length > 0) {
    handleOpen()
  }

  function toggleWidget(id: string) {
    setDraft((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    )
  }

  function moveUp(index: number) {
    if (index === 0) return
    setDraft((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveDown(index: number) {
    setDraft((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    onSave(draft)
    setSaving(false)
    onClose()
  }

  function handleClose() {
    setDraft([])
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Customize Dashboard" size="md">
      <p className="text-sm text-slate-500 mb-4">
        Toggle widgets on or off and reorder them using the arrows.
      </p>

      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {draft.map((widget, index) => (
          <div
            key={widget.id}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
              widget.enabled
                ? 'border-blue-200 bg-blue-50/50'
                : 'border-slate-100 bg-white'
            }`}
          >
            {/* Toggle */}
            <button
              onClick={() => toggleWidget(widget.id)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                widget.enabled ? 'bg-blue-500' : 'bg-slate-300'
              }`}
              aria-label={`Toggle ${widget.label}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  widget.enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{widget.label}</p>
              <p className="text-xs text-slate-500 truncate">{widget.description}</p>
            </div>

            {/* Reorder arrows */}
            <div className="flex flex-col shrink-0">
              <button
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Move up"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => moveDown(index)}
                disabled={index === draft.length - 1}
                className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Move down"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          onClick={handleClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Layout'}
        </button>
      </div>
    </Modal>
  )
}
