'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import FollowUpCompleteModal from '@/components/FollowUpCompleteModal'
import Badge from '@/components/ui/Badge'

interface FollowUpRow {
  id: string
  client_id: string
  assigned_to: string
  activity_type: string
  scheduled_at: string
  status: string
  priority: string | null
  notes: string | null
  sequence_enrollment_id?: string | null
  template_id?: string | null
}

interface ClientBasic {
  id: string
  first_name: string
  last_name: string
}

interface Groups {
  overdue: FollowUpRow[]
  today: FollowUpRow[]
  tomorrow: FollowUpRow[]
  later: FollowUpRow[]
}

interface Props {
  groups: Groups
  clientMap: Record<string, ClientBasic>
}

interface EnrollmentInfo {
  sequence_name: string
  current_step: number
  total_steps: number
}

interface TemplateInfo {
  name: string
  channel: string
  body_text: string | null
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function FollowUpsClient({ groups: initialGroups, clientMap }: Props) {
  const [groups, setGroups] = useState(initialGroups)
  const [completing, setCompleting] = useState<FollowUpRow | null>(null)
  const [enrollmentMap, setEnrollmentMap] = useState<Record<string, EnrollmentInfo>>({})
  const [templateMap, setTemplateMap] = useState<Record<string, TemplateInfo>>({})
  const [expandedTemplates, setExpandedTemplates] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Collect all follow-ups for enrichment
  const allFollowUps = [
    ...groups.overdue,
    ...groups.today,
    ...groups.tomorrow,
    ...groups.later,
  ]

  const loadEnrichments = useCallback(async () => {
    const supabase = createClient()

    // Load enrollment info for follow-ups with sequence_enrollment_id
    const enrollmentIds = [
      ...new Set(allFollowUps.filter(f => f.sequence_enrollment_id).map(f => f.sequence_enrollment_id!)),
    ]
    if (enrollmentIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('sequence_enrollments')
        .select('id, current_step, sequence_id')
        .in('id', enrollmentIds)

      if (enrollments) {
        const map: Record<string, EnrollmentInfo> = {}
        await Promise.all(
          enrollments.map(async (e) => {
            const [seqResult, countResult] = await Promise.all([
              supabase.from('follow_up_sequences').select('name').eq('id', e.sequence_id).single(),
              supabase
                .from('sequence_steps')
                .select('*', { count: 'exact', head: true })
                .eq('sequence_id', e.sequence_id),
            ])
            map[e.id] = {
              sequence_name: seqResult.data?.name || 'Sequence',
              current_step: e.current_step,
              total_steps: countResult.count || 0,
            }
          })
        )
        setEnrollmentMap(map)
      }
    }

    // Load template info for follow-ups with template_id
    const templateIds = [
      ...new Set(allFollowUps.filter(f => f.template_id).map(f => f.template_id!)),
    ]
    if (templateIds.length > 0) {
      const { data: templates } = await supabase
        .from('message_templates')
        .select('id, name, channel, body_text')
        .in('id', templateIds)

      if (templates) {
        const map: Record<string, TemplateInfo> = {}
        templates.forEach(t => {
          map[t.id] = { name: t.name, channel: t.channel, body_text: t.body_text }
        })
        setTemplateMap(map)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadEnrichments()
  }, [loadEnrichments])

  async function handleSkip(fuId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('scheduled_follow_ups')
      .update({ status: 'skipped' })
      .eq('id', fuId)

    if (!error) {
      setGroups(prev => ({
        overdue: prev.overdue.filter(f => f.id !== fuId),
        today: prev.today.filter(f => f.id !== fuId),
        tomorrow: prev.tomorrow.filter(f => f.id !== fuId),
        later: prev.later.filter(f => f.id !== fuId),
      }))
    }
  }

  function handleCompleted() {
    if (!completing) return
    const fuId = completing.id
    setGroups(prev => ({
      overdue: prev.overdue.filter(f => f.id !== fuId),
      today: prev.today.filter(f => f.id !== fuId),
      tomorrow: prev.tomorrow.filter(f => f.id !== fuId),
      later: prev.later.filter(f => f.id !== fuId),
    }))
    setCompleting(null)
  }

  async function handleCopyTemplate(fuId: string, templateId: string) {
    const tmpl = templateMap[templateId]
    if (tmpl?.body_text) {
      await navigator.clipboard.writeText(tmpl.body_text)
      setCopiedId(fuId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  function renderSection(
    label: string,
    items: FollowUpRow[],
    isOverdue: boolean = false,
    showDate: boolean = false,
  ) {
    if (items.length === 0) return null

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className={`text-sm font-semibold uppercase tracking-wide ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
            {label}
          </h2>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
            {items.length}
          </span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          {items.map(fu => {
            const client = clientMap[fu.client_id]
            const clientName = client
              ? `${client.first_name} ${client.last_name}`
              : 'Unknown Client'
            const enrollment = fu.sequence_enrollment_id
              ? enrollmentMap[fu.sequence_enrollment_id]
              : null
            const tmpl = fu.template_id ? templateMap[fu.template_id] : null
            const isExpanded = expandedTemplates[fu.id] || false

            return (
              <div key={fu.id}>
                <div
                  className={`px-4 py-3 flex items-center gap-3 ${isOverdue ? 'bg-red-50/50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/clients/${fu.client_id}`}
                        className="text-sm font-medium text-slate-900 hover:text-blue-600"
                      >
                        {clientName}
                      </Link>
                      {fu.priority && (
                        <span className="text-xs text-red-500 font-medium">{fu.priority}</span>
                      )}
                      {enrollment && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded font-medium">
                          Step {enrollment.current_step} of {enrollment.total_steps} — {enrollment.sequence_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 capitalize">
                        {fu.activity_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-400">
                        {showDate ? formatDate(fu.scheduled_at) : formatTime(fu.scheduled_at)}
                      </span>
                    </div>
                    {fu.notes && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{fu.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {tmpl && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTemplates(prev => ({
                              ...prev,
                              [fu.id]: !prev[fu.id],
                            }))
                          }
                          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50"
                        >
                          {isExpanded ? 'Hide' : 'View'} Template
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyTemplate(fu.id, fu.template_id!)}
                          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50"
                        >
                          {copiedId === fu.id ? 'Copied!' : 'Copy'}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setCompleting(fu)}
                      className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSkip(fu.id)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50"
                    >
                      Skip
                    </button>
                  </div>
                </div>

                {/* Expanded template content */}
                {isExpanded && tmpl && (
                  <div className="px-4 pb-3 bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center gap-2 py-2">
                      <span className="text-xs font-medium text-slate-600">{tmpl.name}</span>
                      <Badge text={tmpl.channel.replace(/_/g, ' ')} variant="info" size="sm" />
                    </div>
                    <div className="text-xs text-slate-600 whitespace-pre-wrap bg-white rounded-lg p-3 border border-slate-100">
                      {tmpl.body_text || 'No body text'}
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

  const total = groups.overdue.length + groups.today.length + groups.tomorrow.length + groups.later.length

  return (
    <>
      {total === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
          <p className="text-slate-400 text-sm">All caught up! No pending follow-ups.</p>
        </div>
      )}

      {renderSection('Overdue', groups.overdue, true, true)}
      {renderSection('Today', groups.today, false, false)}
      {renderSection('Tomorrow', groups.tomorrow, false, false)}
      {renderSection('Later', groups.later, false, true)}

      {completing && (
        <FollowUpCompleteModal
          followUpId={completing.id}
          clientId={completing.client_id}
          clientName={
            clientMap[completing.client_id]
              ? `${clientMap[completing.client_id].first_name} ${clientMap[completing.client_id].last_name}`
              : 'Client'
          }
          activityType={completing.activity_type}
          assignedTo={completing.assigned_to}
          templateId={completing.template_id || undefined}
          onClose={() => setCompleting(null)}
          onCompleted={handleCompleted}
        />
      )}
    </>
  )
}
