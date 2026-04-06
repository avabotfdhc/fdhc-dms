'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Tabs from '@/components/ui/Tabs'

interface Template {
  id: string
  name: string
  channel: string
  subject: string | null
  category: string | null
  is_active: boolean
}

const channelTabs = [
  { key: 'all', label: 'All' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'phone_script', label: 'Phone Scripts' },
]

const channelBadgeVariant = (ch: string) => {
  switch (ch) {
    case 'email':
      return 'info' as const
    case 'sms':
      return 'purple' as const
    case 'phone_script':
      return 'success' as const
    default:
      return 'neutral' as const
  }
}

export default function TemplatesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('message_templates')
        .select('id, name, channel, subject, category, is_active')
        .order('created_at', { ascending: false })
      if (data) setTemplates(data)
      setLoading(false)
    }
    load()
  }, [supabase])

  async function toggleActive(tmpl: Template) {
    const newActive = !tmpl.is_active
    setTemplates(prev =>
      prev.map(t => (t.id === tmpl.id ? { ...t, is_active: newActive } : t))
    )
    await supabase
      .from('message_templates')
      .update({ is_active: newActive })
      .eq('id', tmpl.id)
  }

  async function handleCreate() {
    const { data, error } = await supabase
      .from('message_templates')
      .insert({ name: 'New Template', channel: 'email', is_active: false })
      .select('id')
      .single()

    if (data && !error) {
      router.push(`/settings/templates/${data.id}`)
    }
  }

  const filtered =
    activeTab === 'all'
      ? templates
      : templates.filter(t => t.channel === activeTab)

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-slate-400 hover:text-slate-600 text-sm">
          &larr; Settings
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">Templates</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Message Templates</h1>
          <p className="text-slate-500 text-sm">{templates.length} templates</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Create Template
        </button>
      </div>

      <Tabs tabs={channelTabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="space-y-3 mt-4">
        {filtered.map(tmpl => (
          <div
            key={tmpl.id}
            onClick={() => router.push(`/settings/templates/${tmpl.id}`)}
            className={`bg-white rounded-xl shadow-sm border p-4 transition-all cursor-pointer hover:shadow-md ${
              tmpl.is_active ? 'border-slate-100' : 'border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {tmpl.name}
                  </h3>
                  <Badge
                    text={tmpl.channel.replace(/_/g, ' ')}
                    variant={channelBadgeVariant(tmpl.channel)}
                    size="sm"
                  />
                  {tmpl.category && (
                    <Badge text={tmpl.category} variant="neutral" size="sm" />
                  )}
                </div>
                {tmpl.subject && (
                  <p className="text-xs text-slate-500 truncate">
                    Subject: {tmpl.subject}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    toggleActive(tmpl)
                  }}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    tmpl.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      tmpl.is_active ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm">
            {activeTab === 'all' ? 'No templates yet' : `No ${activeTab.replace(/_/g, ' ')} templates`}
          </p>
          <button onClick={handleCreate} className="text-blue-600 text-sm font-medium mt-2">
            Create your first template
          </button>
        </div>
      )}
    </div>
  )
}
