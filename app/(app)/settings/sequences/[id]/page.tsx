'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import SequenceTimeline from '@/components/SequenceTimeline'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import SaveIndicator from '@/components/ui/SaveIndicator'

interface SequenceStep {
  id: string
  step_order: number
  channel: string
  delay_amount: number | null
  delay_unit: string | null
  template_id: string | null
  template_name?: string | null
  template_body_preview?: string | null
  condition_field: string | null
  condition_operator: string | null
  condition_value: string | null
}

interface Sequence {
  id: string
  name: string
  description: string | null
  trigger_type: string | null
  is_active: boolean
}

interface TemplateOption {
  id: string
  name: string
  channel: string
  body_text: string | null
}

const channelOptions = [
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
]

const delayUnitOptions = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
]

const triggerOptions = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'status_change', label: 'Status Change' },
  { value: 'manual', label: 'Manual Enrollment' },
]

const emptyStep = {
  channel: 'phone',
  delay_amount: '0',
  delay_unit: 'hours',
  template_id: '',
  condition_field: '',
  condition_operator: '',
  condition_value: '',
}

export default function SequenceEditorPage() {
  const params = useParams()
  const sequenceId = params.id as string
  const supabase = createClient()

  const [sequence, setSequence] = useState<Sequence | null>(null)
  const [steps, setSteps] = useState<SequenceStep[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')

  // Step editor modal
  const [stepModalOpen, setStepModalOpen] = useState(false)
  const [editingStep, setEditingStep] = useState(emptyStep)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [stepSaving, setStepSaving] = useState(false)

  const loadData = useCallback(async () => {
    const [seqResult, stepsResult, templatesResult] = await Promise.all([
      supabase.from('follow_up_sequences').select('*').eq('id', sequenceId).single(),
      supabase
        .from('sequence_steps')
        .select('id, step_order, channel, delay_amount, delay_unit, template_id, condition_field, condition_operator, condition_value')
        .eq('sequence_id', sequenceId)
        .order('step_order'),
      supabase.from('message_templates').select('id, name, channel, body_text').eq('is_active', true),
    ])

    if (seqResult.data) setSequence(seqResult.data)
    if (templatesResult.data) setTemplates(templatesResult.data)

    if (stepsResult.data) {
      const enriched = stepsResult.data.map(step => {
        const tmpl = templatesResult.data?.find(t => t.id === step.template_id)
        return {
          ...step,
          template_name: tmpl?.name || null,
          template_body_preview: tmpl?.body_text || null,
        }
      })
      setSteps(enriched)
    }
    setLoading(false)
  }, [supabase, sequenceId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleSaveSequence() {
    if (!sequence) return
    setSaveStatus('saving')
    const { error } = await supabase
      .from('follow_up_sequences')
      .update({
        name: sequence.name,
        description: sequence.description,
        trigger_type: sequence.trigger_type,
      })
      .eq('id', sequenceId)

    setSaveStatus(error ? 'error' : 'saved')
  }

  function handleSequenceChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    if (!sequence) return
    setSaveStatus('unsaved')
    setSequence({ ...sequence, [e.target.name]: e.target.value })
  }

  function openAddStep() {
    setEditingStep({ ...emptyStep })
    setEditingStepId(null)
    setStepModalOpen(true)
  }

  function openEditStep(step: SequenceStep) {
    setEditingStep({
      channel: step.channel,
      delay_amount: String(step.delay_amount || 0),
      delay_unit: step.delay_unit || 'hours',
      template_id: step.template_id || '',
      condition_field: step.condition_field || '',
      condition_operator: step.condition_operator || '',
      condition_value: step.condition_value || '',
    })
    setEditingStepId(step.id)
    setStepModalOpen(true)
  }

  async function handleSaveStep() {
    setStepSaving(true)
    try {
      const payload = {
        sequence_id: sequenceId,
        channel: editingStep.channel,
        delay_amount: parseInt(editingStep.delay_amount) || 0,
        delay_unit: editingStep.delay_unit,
        template_id: editingStep.template_id || null,
        condition_field: editingStep.condition_field || null,
        condition_operator: editingStep.condition_operator || null,
        condition_value: editingStep.condition_value || null,
      }

      if (editingStepId) {
        await supabase.from('sequence_steps').update(payload).eq('id', editingStepId)
      } else {
        const nextOrder = steps.length > 0 ? Math.max(...steps.map(s => s.step_order)) + 1 : 1
        await supabase.from('sequence_steps').insert({ ...payload, step_order: nextOrder })
      }

      await loadData()
      setStepModalOpen(false)
    } finally {
      setStepSaving(false)
    }
  }

  async function handleDeleteStep(stepId: string) {
    setSteps(prev => prev.filter(s => s.id !== stepId))
    await supabase.from('sequence_steps').delete().eq('id', stepId)
  }

  function handleStepFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setEditingStep(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-32 bg-slate-100 rounded-xl" />
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!sequence) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <p className="text-slate-500">Sequence not found.</p>
        <Link href="/settings/sequences" className="text-blue-600 text-sm mt-2 inline-block">
          Back to Sequences
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-slate-400 hover:text-slate-600 text-sm">
          &larr; Settings
        </Link>
        <span className="text-slate-300">/</span>
        <Link href="/settings/sequences" className="text-slate-400 hover:text-slate-600 text-sm">
          Sequences
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700 truncate">{sequence.name}</span>
      </div>

      {/* Sequence details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 text-sm">Sequence Details</h2>
          <SaveIndicator status={saveStatus} />
        </div>

        <div className="space-y-4">
          <FormField
            label="Sequence Name"
            name="name"
            value={sequence.name}
            onChange={handleSequenceChange}
            required
          />
          <FormField
            label="Description"
            name="description"
            type="textarea"
            value={sequence.description || ''}
            onChange={handleSequenceChange}
            placeholder="Describe what this sequence does..."
          />
          <FormField
            label="Trigger Type"
            name="trigger_type"
            type="select"
            value={sequence.trigger_type || ''}
            onChange={handleSequenceChange}
            options={triggerOptions}
          />

          <button
            onClick={handleSaveSequence}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Save Details
          </button>
        </div>
      </div>

      {/* Steps timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 text-sm">
            Steps ({steps.length})
          </h2>
          <button
            onClick={openAddStep}
            className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors"
          >
            + Add Step
          </button>
        </div>

        <SequenceTimeline
          steps={steps}
          onStepEdit={openEditStep}
          onStepDelete={handleDeleteStep}
          onStepAdd={openAddStep}
        />
      </div>

      {/* Step Editor Modal */}
      <Modal
        isOpen={stepModalOpen}
        onClose={() => setStepModalOpen(false)}
        title={editingStepId ? 'Edit Step' : 'Add Step'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Channel"
              name="channel"
              type="select"
              value={editingStep.channel}
              onChange={handleStepFormChange}
              options={channelOptions}
              required
            />
            <FormField
              label="Template"
              name="template_id"
              type="select"
              value={editingStep.template_id}
              onChange={handleStepFormChange}
              options={templates
                .filter(t => !editingStep.channel || t.channel === editingStep.channel)
                .map(t => ({ value: t.id, label: t.name }))}
              placeholder="Select template..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Delay Amount"
              name="delay_amount"
              type="number"
              value={editingStep.delay_amount}
              onChange={handleStepFormChange}
            />
            <FormField
              label="Delay Unit"
              name="delay_unit"
              type="select"
              value={editingStep.delay_unit}
              onChange={handleStepFormChange}
              options={delayUnitOptions}
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Condition (optional)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <FormField
                label="Field"
                name="condition_field"
                value={editingStep.condition_field}
                onChange={handleStepFormChange}
                placeholder="e.g., status"
              />
              <FormField
                label="Operator"
                name="condition_operator"
                type="select"
                value={editingStep.condition_operator}
                onChange={handleStepFormChange}
                options={[
                  { value: 'equals', label: 'Equals' },
                  { value: 'not_equals', label: 'Not Equals' },
                  { value: 'contains', label: 'Contains' },
                ]}
              />
              <FormField
                label="Value"
                name="condition_value"
                value={editingStep.condition_value}
                onChange={handleStepFormChange}
                placeholder="e.g., active"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSaveStep}
              disabled={stepSaving || !editingStep.channel}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {stepSaving ? 'Saving...' : editingStepId ? 'Update Step' : 'Add Step'}
            </button>
            <button
              onClick={() => setStepModalOpen(false)}
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
