'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { processActivityOutcome } from '@/lib/automation-engine'
import Badge from '@/components/ui/Badge'

interface FollowUpCompleteModalProps {
  followUpId: string
  clientId: string
  clientName: string
  activityType: string
  assignedTo: string
  templateId?: string
  onClose: () => void
  onCompleted: () => void
}

interface TemplateData {
  name: string
  channel: string
  subject: string | null
  body_text: string | null
  body_html: string | null
}

const OUTCOMES = [
  'No Answer',
  'Voicemail',
  'Connected',
  'Appointment Set',
  'Not Interested',
  'Callback Requested',
  'Follow Up Later',
] as const

export default function FollowUpCompleteModal({
  followUpId,
  clientId,
  clientName,
  activityType,
  assignedTo,
  templateId,
  onClose,
  onCompleted,
}: FollowUpCompleteModalProps) {
  const [outcome, setOutcome] = useState('Connected')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [copied, setCopied] = useState(false)

  const selectClass =
    'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  const loadTemplate = useCallback(async () => {
    if (!templateId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('message_templates')
      .select('name, channel, subject, body_text, body_html')
      .eq('id', templateId)
      .single()
    if (data) setTemplate(data)
  }, [templateId])

  useEffect(() => {
    loadTemplate()
  }, [loadTemplate])

  async function handleCopyTemplate() {
    if (template?.body_text) {
      await navigator.clipboard.writeText(template.body_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const supabase = createClient()

      // Mark follow-up as completed
      const { error: updateErr } = await supabase
        .from('scheduled_follow_ups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          outcome_notes: notes,
        })
        .eq('id', followUpId)

      if (updateErr) throw new Error(updateErr.message)

      // Log activity on the client
      const { data: client } = await supabase
        .from('clients')
        .select('interactions, contact_attempts')
        .eq('id', clientId)
        .single()

      if (client) {
        const interactions: Record<string, unknown>[] = Array.isArray(client.interactions)
          ? client.interactions
          : []
        interactions.push({
          type: activityType,
          outcome,
          notes,
          date: new Date().toISOString(),
          source: 'follow_up',
        })

        await supabase
          .from('clients')
          .update({
            interactions,
            contact_attempts: (client.contact_attempts || 0) + 1,
            last_contact_at: new Date().toISOString(),
          })
          .eq('id', clientId)
      }

      // Trigger automation for next follow-up
      try {
        await processActivityOutcome(supabase, {
          clientId,
          activityType: activityType.toLowerCase().replace(/\s+/g, '_'),
          outcome: outcome.toLowerCase().replace(/\s+/g, '_'),
          assignedTo,
        })
      } catch {
        // Non-fatal
      }

      onCompleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete')
      setSaving(false)
    }
  }

  const charCount = template?.body_text?.length || 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Complete Follow-up</h3>
            <p className="text-sm text-slate-500">{clientName}</p>
          </div>
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
              placeholder="Add outcome notes..."
            />
          </div>

          {/* Template section */}
          {template && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">{template.name}</span>
                  <Badge
                    text={template.channel.replace(/_/g, ' ')}
                    variant={
                      template.channel === 'email'
                        ? 'info'
                        : template.channel === 'sms'
                        ? 'purple'
                        : 'success'
                    }
                    size="sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyTemplate}
                  className="text-xs text-blue-600 font-medium hover:text-blue-700"
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>

              <div className="px-3 py-2">
                {/* Email: show subject + preview */}
                {template.channel === 'email' && template.subject && (
                  <p className="text-xs font-medium text-slate-600 mb-1">
                    Subject: {template.subject}
                  </p>
                )}

                {template.channel === 'email' && template.body_html ? (
                  <div
                    className="text-xs text-slate-600 leading-relaxed prose prose-xs max-w-none max-h-32 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: template.body_html }}
                  />
                ) : (
                  <div className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                    {template.body_text || 'No content'}
                  </div>
                )}

                {/* SMS character count */}
                {template.channel === 'sms' && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    {charCount} chars · {charCount <= 160 ? '1 segment' : `${Math.ceil(charCount / 153)} segments`}
                  </p>
                )}

                {/* Phone script indicator */}
                {template.channel === 'phone_script' && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">
                    {'\uD83D\uDCDE'} Talking points above
                  </p>
                )}
              </div>
            </div>
          )}

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
              {saving ? 'Saving...' : 'Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
