'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import FormField from '@/components/ui/FormField'
import SaveIndicator from '@/components/ui/SaveIndicator'
import VariableInserter from '@/components/VariableInserter'
import TemplatePreview from '@/components/TemplatePreview'

interface Template {
  id: string
  name: string
  channel: string
  subject: string | null
  body_text: string | null
  body_html: string | null
  category: string | null
  is_active: boolean
}

const channelOptions = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'phone_script', label: 'Phone Script' },
]

const categoryOptions = [
  { value: 'introduction', label: 'Introduction' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'post_sale', label: 'Post-sale' },
  { value: 'general', label: 'General' },
]

export default function TemplateEditorPage() {
  const params = useParams()
  const templateId = params.id as string
  const supabase = createClient()

  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const bodyTextRef = useRef<HTMLTextAreaElement>(null)
  const bodyHtmlRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId)
      .single()
    if (data) setTemplate(data)
    setLoading(false)
  }, [supabase, templateId])

  useEffect(() => {
    load()
  }, [load])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    if (!template) return
    setSaveStatus('unsaved')
    setTemplate({ ...template, [e.target.name]: e.target.value })
  }

  function handleInsertVariable(variable: string) {
    if (!template) return
    // Insert at cursor in body_text textarea, or append
    const textarea = bodyTextRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = template.body_text || ''
      const newText = text.slice(0, start) + variable + text.slice(end)
      setSaveStatus('unsaved')
      setTemplate({ ...template, body_text: newText })
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length
        textarea.focus()
      })
    } else {
      setSaveStatus('unsaved')
      setTemplate({ ...template, body_text: (template.body_text || '') + variable })
    }
  }

  async function handleSave() {
    if (!template) return
    setSaveStatus('saving')
    const { error } = await supabase
      .from('message_templates')
      .update({
        name: template.name,
        channel: template.channel,
        subject: template.subject,
        body_text: template.body_text,
        body_html: template.body_html,
        category: template.category,
      })
      .eq('id', templateId)

    setSaveStatus(error ? 'error' : 'saved')
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <p className="text-slate-500">Template not found.</p>
        <Link href="/settings/templates" className="text-blue-600 text-sm mt-2 inline-block">
          Back to Templates
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 md:pb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-slate-400 hover:text-slate-600 text-sm">
          &larr; Settings
        </Link>
        <span className="text-slate-300">/</span>
        <Link href="/settings/templates" className="text-slate-400 hover:text-slate-600 text-sm">
          Templates
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700 truncate">{template.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Template</h1>
        <div className="flex items-center gap-3">
          <SaveIndicator status={saveStatus} />
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* Split pane: form left, preview right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
            <FormField
              label="Template Name"
              name="name"
              value={template.name}
              onChange={handleChange}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Channel"
                name="channel"
                type="select"
                value={template.channel}
                onChange={handleChange}
                options={channelOptions}
                required
              />
              <FormField
                label="Category"
                name="category"
                type="select"
                value={template.category || ''}
                onChange={handleChange}
                options={categoryOptions}
              />
            </div>

            {template.channel === 'email' && (
              <FormField
                label="Subject"
                name="subject"
                value={template.subject || ''}
                onChange={handleChange}
                placeholder="Email subject line..."
              />
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="field-body_text"
                className="block text-sm font-medium text-slate-700"
              >
                Body Text
              </label>
              <textarea
                ref={bodyTextRef}
                id="field-body_text"
                name="body_text"
                value={template.body_text || ''}
                onChange={handleChange}
                rows={8}
                placeholder="Write your message..."
                className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-blue-500 focus:ring-blue-200"
              />
              <VariableInserter onInsert={handleInsertVariable} />
            </div>

            {template.channel === 'email' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="field-body_html"
                  className="block text-sm font-medium text-slate-700"
                >
                  Body HTML <span className="text-xs text-slate-400 font-normal">(optional, overrides text for email)</span>
                </label>
                <textarea
                  ref={bodyHtmlRef}
                  id="field-body_html"
                  name="body_html"
                  value={template.body_html || ''}
                  onChange={handleChange}
                  rows={6}
                  placeholder="<p>HTML version of your email...</p>"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-blue-500 focus:ring-blue-200 font-mono text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <TemplatePreview
            channel={template.channel}
            subject={template.subject || undefined}
            bodyHtml={template.body_html || undefined}
            bodyText={template.body_text || undefined}
          />
        </div>
      </div>
    </div>
  )
}
