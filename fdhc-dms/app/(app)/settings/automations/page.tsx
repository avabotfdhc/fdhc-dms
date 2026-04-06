'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import Link from 'next/link'

interface Rule {
  id: string
  trigger_activity_type: string
  trigger_outcome: string
  action_type: string
  delay: string | null
  template_text: string | null
  is_active: boolean
  [key: string]: unknown
}

const emptyRule = {
  trigger_activity_type: '',
  trigger_outcome: '',
  action_type: '',
  delay: '',
  template_text: '',
  is_active: true,
}

const activityTypes = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'text', label: 'Text' },
  { value: 'visit', label: 'Visit' },
  { value: 'follow_up', label: 'Follow-up' },
]

const outcomeTypes = [
  { value: 'no_answer', label: 'No Answer' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'callback_requested', label: 'Callback Requested' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'completed', label: 'Completed' },
]

const actionTypes = [
  { value: 'schedule_call', label: 'Schedule Call' },
  { value: 'schedule_email', label: 'Schedule Email' },
  { value: 'schedule_text', label: 'Schedule Text' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'update_status', label: 'Update Status' },
]

export default function AutomationsPage() {
  const supabase = createClient()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Partial<Rule> & typeof emptyRule>(emptyRule)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('follow_up_rules')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setRules(data as Rule[])
      setLoading(false)
    }
    load()
  }, [supabase])

  function openNew() {
    setEditingRule({ ...emptyRule })
    setEditingId(null)
    setModalOpen(true)
  }

  function openEdit(rule: Rule) {
    setEditingRule({
      trigger_activity_type: rule.trigger_activity_type || '',
      trigger_outcome: rule.trigger_outcome || '',
      action_type: rule.action_type || '',
      delay: rule.delay || '',
      template_text: rule.template_text || '',
      is_active: rule.is_active,
    })
    setEditingId(rule.id)
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editingId) {
        await supabase.from('follow_up_rules').update(editingRule).eq('id', editingId)
      } else {
        await supabase.from('follow_up_rules').insert(editingRule)
      }
      // Reload
      const { data } = await supabase.from('follow_up_rules').select('*').order('created_at', { ascending: false })
      if (data) setRules(data as Rule[])
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(rule: Rule) {
    const newActive = !rule.is_active
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: newActive } : r))
    await supabase.from('follow_up_rules').update({ is_active: newActive }).eq('id', rule.id)
  }

  async function deleteRule(id: string) {
    setRules(prev => prev.filter(r => r.id !== id))
    await supabase.from('follow_up_rules').delete().eq('id', id)
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setEditingRule(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-slate-400 hover:text-slate-600 text-sm">&larr; Settings</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">Automations</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Automation Rules</h1>
          <p className="text-slate-500 text-sm">{rules.length} follow-up rules</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Add Rule
        </button>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${
              rule.is_active ? 'border-slate-100' : 'border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  When{' '}
                  <span className="text-blue-600">{rule.trigger_activity_type || '...'}</span>
                  {' '}results in{' '}
                  <span className="text-purple-600">{(rule.trigger_outcome || '...').replace(/_/g, ' ')}</span>
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  → Schedule{' '}
                  <span className="text-emerald-600">{(rule.action_type || '...').replace(/_/g, ' ')}</span>
                  {rule.delay && (
                    <> in <span className="font-medium">{rule.delay}</span></>
                  )}
                </p>
                {rule.template_text && (
                  <p className="text-xs text-slate-500 mt-1 truncate">Template: {rule.template_text}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Enable/disable toggle */}
                <button
                  type="button"
                  onClick={() => toggleActive(rule)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    rule.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      rule.is_active ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>

                <button
                  onClick={() => openEdit(rule)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm">No automation rules yet</p>
          <button onClick={openNew} className="text-blue-600 text-sm font-medium mt-2">
            Create your first rule
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Rule' : 'New Automation Rule'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Trigger Activity"
              name="trigger_activity_type"
              type="select"
              value={editingRule.trigger_activity_type}
              onChange={handleFormChange}
              options={activityTypes}
              required
            />
            <FormField
              label="Trigger Outcome"
              name="trigger_outcome"
              type="select"
              value={editingRule.trigger_outcome}
              onChange={handleFormChange}
              options={outcomeTypes}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Action"
              name="action_type"
              type="select"
              value={editingRule.action_type}
              onChange={handleFormChange}
              options={actionTypes}
              required
            />
            <FormField
              label="Delay"
              name="delay"
              value={editingRule.delay}
              onChange={handleFormChange}
              placeholder="e.g., 1 day, 2 hours, 30 minutes"
            />
          </div>
          <FormField
            label="Template Text"
            name="template_text"
            type="textarea"
            value={editingRule.template_text || ''}
            onChange={handleFormChange}
            placeholder="Message template for the follow-up..."
          />

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !editingRule.trigger_activity_type || !editingRule.action_type}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : editingId ? 'Update Rule' : 'Create Rule'}
            </button>
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
