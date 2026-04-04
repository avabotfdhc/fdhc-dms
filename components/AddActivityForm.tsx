'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { processActivityOutcome, type ActivityOutcomeInput } from '@/lib/automation-engine'

interface AddActivityFormProps {
  clientId: string
  onClose: () => void
  onSaved: () => void
}

const ACTIVITY_TYPES = [
  'Phone Call',
  'Email',
  'SMS',
  'Appointment',
  'Site Visit',
  'Note',
] as const

const DIRECTIONS = ['Inbound', 'Outbound'] as const

const OUTCOMES = [
  'No Answer',
  'Voicemail',
  'Connected',
  'Appointment Set',
  'Not Interested',
  'Callback Requested',
  'Follow Up Later',
] as const

export default function AddActivityForm({
  clientId,
  onClose,
  onSaved,
}: AddActivityFormProps) {
  const [type, setType] = useState<string>('Phone Call')
  const [direction, setDirection] = useState<string>('Outbound')
  const [outcome, setOutcome] = useState<string>('Connected')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectClass =
    'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const supabase = createClient()

      // Fetch current client
      const { data: client, error: fetchErr } = await supabase
        .from('clients')
        .select('interactions, contact_attempts, assigned_to')
        .eq('id', clientId)
        .single()

      if (fetchErr) throw new Error(fetchErr.message)

      const now = new Date().toISOString()
      const interactions: Record<string, unknown>[] = Array.isArray(client.interactions)
        ? client.interactions
        : []

      interactions.push({
        type,
        direction,
        outcome,
        notes,
        date: now,
      })

      const { error: updateErr } = await supabase
        .from('clients')
        .update({
          interactions,
          contact_attempts: (client.contact_attempts || 0) + 1,
          last_contact_at: now,
        })
        .eq('id', clientId)

      if (updateErr) throw new Error(updateErr.message)

      // Fire automation engine
      try {
        const input: ActivityOutcomeInput = {
          clientId,
          activityType: type.toLowerCase().replace(/\s+/g, '_'),
          outcome: outcome.toLowerCase().replace(/\s+/g, '_'),
          assignedTo: client.assigned_to || '',
        }
        await processActivityOutcome(supabase, input)
      } catch {
        // Non-fatal: automation rules may not exist yet
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Log Activity</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
          >
            &#x2715;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className={selectClass}>
              {ACTIVITY_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Direction</label>
            <select value={direction} onChange={e => setDirection(e.target.value)} className={selectClass}>
              {DIRECTIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Outcome</label>
            <select value={outcome} onChange={e => setOutcome(e.target.value)} className={selectClass}>
              {OUTCOMES.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className={selectClass}
              placeholder="Add any notes..."
            />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
