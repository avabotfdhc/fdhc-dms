'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProjectMilestones, { DEFAULT_MILESTONES, type MilestoneTask } from '@/components/ProjectMilestones'
import SaveIndicator from '@/components/ui/SaveIndicator'
import Link from 'next/link'

export default function ProjectPage() {
  const params = useParams()
  const dealId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<MilestoneTask[]>(DEFAULT_MILESTONES)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const [dealNumber, setDealNumber] = useState<number | null>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>()

  // Load or create project
  useEffect(() => {
    async function loadProject() {
      // Get deal info
      const { data: deal } = await supabase
        .from('agreements')
        .select('deal_number, project_id')
        .eq('id', dealId)
        .single()

      if (deal) setDealNumber(deal.deal_number)

      if (deal?.project_id) {
        // Load existing project
        const { data: project } = await supabase
          .from('projects')
          .select('id, tasks')
          .eq('id', deal.project_id)
          .single()

        if (project) {
          setProjectId(project.id)
          const projectTasks = project.tasks as MilestoneTask[] | null
          if (projectTasks && Array.isArray(projectTasks) && projectTasks.length > 0) {
            setTasks(projectTasks)
          }
        }
      } else {
        // Create new project for this deal
        const { data: newProject } = await supabase
          .from('projects')
          .insert({
            agreement_id: dealId,
            tasks: DEFAULT_MILESTONES,
            status: 'active',
          })
          .select('id')
          .single()

        if (newProject) {
          setProjectId(newProject.id)
          // Link project to deal
          await supabase
            .from('agreements')
            .update({ project_id: newProject.id })
            .eq('id', dealId)
        }
      }
      setLoading(false)
    }

    loadProject()
  }, [dealId, supabase])

  const saveTasks = useCallback(async (updatedTasks: MilestoneTask[]) => {
    if (!projectId) return
    setSaveStatus('saving')
    try {
      await supabase
        .from('projects')
        .update({ tasks: updatedTasks })
        .eq('id', projectId)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [projectId, supabase])

  function handleUpdate(updatedTasks: MilestoneTask[]) {
    setTasks(updatedTasks)
    setSaveStatus('unsaved')
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => saveTasks(updatedTasks), 1000)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-4 bg-slate-200 rounded w-32" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/agreements/${dealId}`} className="text-slate-400 hover:text-slate-600 text-sm">&larr; Deal {dealNumber ? `#${dealNumber}` : ''}</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">Project Tracker</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Tracker</h1>
          <p className="text-slate-500 text-sm">Deal #{dealNumber || '...'} delivery milestones</p>
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      <ProjectMilestones tasks={tasks} onUpdate={handleUpdate} />
    </div>
  )
}
