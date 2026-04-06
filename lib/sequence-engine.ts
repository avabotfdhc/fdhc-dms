// ---------------------------------------------------------------------------
// Sequence engine — multi-step follow-up sequences with branching & templates
// ---------------------------------------------------------------------------

import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SequenceStep {
  id: string
  sequence_id: string
  step_number: number
  delay_minutes: number
  delay_days: number
  channel: string
  template_id: string | null
  condition_field: string | null
  condition_value: string | null
  business_hours_only: boolean
}

export interface SequenceEnrollment {
  id: string
  client_id: string
  sequence_id: string
  current_step: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  enrolled_at: string
  last_step_at: string | null
  cancelled_reason: string | null
}

export interface MessageTemplate {
  id: string
  name: string
  channel: string
  subject: string | null
  body_html: string | null
  body_text: string | null
  category: string | null
  variables: string[] | null
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Enroll a client in a sequence. Skips if client already has an active
 * enrollment in the same sequence. Immediately schedules the first step.
 */
export async function enrollInSequence(
  supabase: SupabaseClient,
  clientId: string,
  sequenceId: string,
): Promise<string> {
  // Check for existing active enrollment in this sequence
  const { data: existing, error: existError } = await supabase
    .from('sequence_enrollments')
    .select('id')
    .eq('client_id', clientId)
    .eq('sequence_id', sequenceId)
    .eq('status', 'active')
    .maybeSingle()

  if (existError) {
    throw new Error(`Failed to check existing enrollment: ${existError.message}`)
  }

  if (existing) {
    // Already enrolled — return existing enrollment id
    return existing.id
  }

  // Insert new enrollment
  const { data: enrollment, error: insertError } = await supabase
    .from('sequence_enrollments')
    .insert({
      client_id: clientId,
      sequence_id: sequenceId,
      current_step: 0,
      status: 'active',
      enrolled_at: new Date().toISOString(),
      last_step_at: null,
    })
    .select('id')
    .single()

  if (insertError || !enrollment) {
    throw new Error(
      `Failed to create enrollment: ${insertError?.message ?? 'no data returned'}`,
    )
  }

  // Fetch the first step(s) and schedule
  const { data: steps, error: stepsError } = await supabase
    .from('sequence_steps')
    .select('*')
    .eq('sequence_id', sequenceId)
    .order('step_number', { ascending: true })
    .limit(1)

  if (stepsError) {
    throw new Error(`Failed to fetch first step: ${stepsError.message}`)
  }

  if (steps && steps.length > 0) {
    const fullEnrollment: SequenceEnrollment = {
      id: enrollment.id,
      client_id: clientId,
      sequence_id: sequenceId,
      current_step: 0,
      status: 'active',
      enrolled_at: new Date().toISOString(),
      last_step_at: null,
      cancelled_reason: null,
    }
    await scheduleSequenceStep(supabase, fullEnrollment, steps[0] as SequenceStep)
  }

  return enrollment.id
}

/**
 * Advance an enrollment to the next eligible step. Called after a follow-up
 * is completed. Handles conditional branching: when multiple steps share a
 * step_number the one whose condition matches the previousOutcome wins.
 */
export async function advanceSequence(
  supabase: SupabaseClient,
  enrollmentId: string,
  previousOutcome: string | null,
): Promise<void> {
  // Fetch enrollment
  const { data: enrollment, error: enrollError } = await supabase
    .from('sequence_enrollments')
    .select('*')
    .eq('id', enrollmentId)
    .single()

  if (enrollError || !enrollment) {
    throw new Error(
      `Failed to fetch enrollment: ${enrollError?.message ?? 'not found'}`,
    )
  }

  if (enrollment.status !== 'active') {
    return // paused, completed, or cancelled — do nothing
  }

  // Fetch all steps for this sequence, ordered by step_number
  const { data: allSteps, error: stepsError } = await supabase
    .from('sequence_steps')
    .select('*')
    .eq('sequence_id', enrollment.sequence_id)
    .order('step_number', { ascending: true })

  if (stepsError) {
    throw new Error(`Failed to fetch sequence steps: ${stepsError.message}`)
  }

  if (!allSteps || allSteps.length === 0) {
    // No steps — mark completed
    await supabase
      .from('sequence_enrollments')
      .update({ status: 'completed', last_step_at: new Date().toISOString() })
      .eq('id', enrollmentId)
    return
  }

  const steps = allSteps as SequenceStep[]
  const currentStep = enrollment.current_step as number

  // Find candidate steps with step_number > current
  const candidates = steps.filter((s) => s.step_number > currentStep)

  if (candidates.length === 0) {
    // No more steps — mark completed
    await supabase
      .from('sequence_enrollments')
      .update({ status: 'completed', last_step_at: new Date().toISOString() })
      .eq('id', enrollmentId)
    return
  }

  // Group by step_number and iterate in order
  const stepNumbers = [...new Set(candidates.map((s) => s.step_number))].sort(
    (a, b) => a - b,
  )

  for (const stepNum of stepNumbers) {
    const group = candidates.filter((s) => s.step_number === stepNum)

    // If any step in this group has a condition, pick the matching one
    const conditional = group.filter((s) => s.condition_field && s.condition_value)

    if (conditional.length > 0) {
      const matched = conditional.find(
        (s) => s.condition_value === previousOutcome,
      )
      if (matched) {
        await scheduleAndUpdate(supabase, enrollment as SequenceEnrollment, matched)
        return
      }
      // No condition matched — try unconditional steps at this number
      const unconditional = group.filter(
        (s) => !s.condition_field || !s.condition_value,
      )
      if (unconditional.length > 0) {
        await scheduleAndUpdate(
          supabase,
          enrollment as SequenceEnrollment,
          unconditional[0],
        )
        return
      }
      // No match at all — skip this step_number and try next
      continue
    }

    // No conditional steps — just schedule the first unconditional one
    await scheduleAndUpdate(supabase, enrollment as SequenceEnrollment, group[0])
    return
  }

  // Exhausted all candidates without scheduling anything — mark completed
  await supabase
    .from('sequence_enrollments')
    .update({ status: 'completed', last_step_at: new Date().toISOString() })
    .eq('id', enrollmentId)
}

/** Internal helper: schedule a step and update the enrollment row. */
async function scheduleAndUpdate(
  supabase: SupabaseClient,
  enrollment: SequenceEnrollment,
  step: SequenceStep,
): Promise<void> {
  await scheduleSequenceStep(supabase, enrollment, step)
  await supabase
    .from('sequence_enrollments')
    .update({
      current_step: step.step_number,
      last_step_at: new Date().toISOString(),
    })
    .eq('id', enrollment.id)
}

/**
 * Schedule a single sequence step as a follow-up row. Calculates the
 * scheduled_at timestamp from the step's delays and clamps to business hours
 * when required.
 */
export async function scheduleSequenceStep(
  supabase: SupabaseClient,
  enrollment: SequenceEnrollment,
  step: SequenceStep,
): Promise<void> {
  // Calculate scheduled_at
  const scheduledAt = new Date()
  scheduledAt.setMinutes(scheduledAt.getMinutes() + (step.delay_minutes || 0))
  scheduledAt.setDate(scheduledAt.getDate() + (step.delay_days || 0))

  if (step.business_hours_only) {
    const clamped = clampToBusinessHours(scheduledAt)
    scheduledAt.setTime(clamped.getTime())
  }

  // Render template body if template_id is set
  let notes: string | null = null
  if (step.template_id) {
    const { data: template } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', step.template_id)
      .maybeSingle()

    if (template) {
      const variables = await getTemplateVariables(supabase, enrollment.client_id)
      const rendered = renderTemplate(template as MessageTemplate, variables)
      notes = rendered.bodyText
    }
  }

  // Fetch client to get assigned_to
  const { data: client } = await supabase
    .from('clients')
    .select('assigned_to')
    .eq('id', enrollment.client_id)
    .single()

  const { error: insertError } = await supabase
    .from('scheduled_follow_ups')
    .insert({
      client_id: enrollment.client_id,
      assigned_to: client?.assigned_to ?? null,
      activity_type: step.channel,
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending',
      priority: null,
      notes,
      template_id: step.template_id,
      sequence_enrollment_id: enrollment.id,
      step_number: step.step_number,
    })

  if (insertError) {
    throw new Error(
      `Failed to schedule sequence step: ${insertError.message}`,
    )
  }
}

/**
 * Pause an active enrollment and cancel its pending follow-ups.
 */
export async function pauseSequence(
  supabase: SupabaseClient,
  enrollmentId: string,
): Promise<void> {
  const { error: updateError } = await supabase
    .from('sequence_enrollments')
    .update({ status: 'paused' })
    .eq('id', enrollmentId)

  if (updateError) {
    throw new Error(`Failed to pause enrollment: ${updateError.message}`)
  }

  // Cancel pending follow-ups tied to this enrollment
  await supabase
    .from('scheduled_follow_ups')
    .update({ status: 'cancelled' })
    .eq('sequence_enrollment_id', enrollmentId)
    .eq('status', 'pending')
}

/**
 * Resume a paused enrollment and re-advance from the current step.
 */
export async function resumeSequence(
  supabase: SupabaseClient,
  enrollmentId: string,
): Promise<void> {
  const { error: updateError } = await supabase
    .from('sequence_enrollments')
    .update({ status: 'active' })
    .eq('id', enrollmentId)

  if (updateError) {
    throw new Error(`Failed to resume enrollment: ${updateError.message}`)
  }

  // Re-advance from where we left off
  await advanceSequence(supabase, enrollmentId, null)
}

/**
 * Cancel an enrollment permanently and remove its pending follow-ups.
 */
export async function cancelSequence(
  supabase: SupabaseClient,
  enrollmentId: string,
  reason?: string,
): Promise<void> {
  const { error: updateError } = await supabase
    .from('sequence_enrollments')
    .update({
      status: 'cancelled',
      cancelled_reason: reason ?? null,
    })
    .eq('id', enrollmentId)

  if (updateError) {
    throw new Error(`Failed to cancel enrollment: ${updateError.message}`)
  }

  // Cancel pending follow-ups
  await supabase
    .from('scheduled_follow_ups')
    .update({ status: 'cancelled' })
    .eq('sequence_enrollment_id', enrollmentId)
    .eq('status', 'pending')
}

// ---------------------------------------------------------------------------
// Template rendering
// ---------------------------------------------------------------------------

/**
 * Replace `{variable}` placeholders in a message template with actual values.
 */
export function renderTemplate(
  template: MessageTemplate,
  data: Record<string, string>,
): { subject: string; bodyHtml: string; bodyText: string } {
  const replace = (text: string | null): string => {
    if (!text) return ''
    return text.replace(/\{(\w+)\}/g, (_match, key: string) => data[key] ?? '')
  }

  return {
    subject: replace(template.subject),
    bodyHtml: replace(template.body_html),
    bodyText: replace(template.body_text),
  }
}

/**
 * Build a variables map for template rendering by fetching client, rep, and
 * dealership data.
 */
export async function getTemplateVariables(
  supabase: SupabaseClient,
  clientId: string,
): Promise<Record<string, string>> {
  // Fetch client
  const { data: client } = await supabase
    .from('clients')
    .select(
      'first_name, last_name, email, phone, assigned_to, model_interest, delivery_date',
    )
    .eq('id', clientId)
    .single()

  const vars: Record<string, string> = {
    first_name: client?.first_name ?? '',
    last_name: client?.last_name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    model_name: client?.model_interest ?? '',
    delivery_date: client?.delivery_date ?? '',
  }

  // Fetch assigned rep profile
  if (client?.assigned_to) {
    const { data: rep } = await supabase
      .from('profiles')
      .select('name, phone, email')
      .eq('id', client.assigned_to)
      .single()

    if (rep) {
      vars.rep_name = rep.name ?? ''
      vars.rep_phone = rep.phone ?? ''
      vars.rep_email = rep.email ?? ''
    }
  }

  // Fetch dealership settings
  const { data: settings } = await supabase
    .from('dealership_settings')
    .select('dealership_name, phone, address')
    .limit(1)
    .maybeSingle()

  if (settings) {
    vars.dealership_name = settings.dealership_name ?? ''
    vars.dealership_phone = settings.phone ?? ''
    vars.dealership_address = settings.address ?? ''
  }

  return vars
}

// ---------------------------------------------------------------------------
// Business hours utility
// ---------------------------------------------------------------------------

/**
 * Clamp a date to business hours: 8 AM - 9 PM, Monday-Friday.
 *
 * - Before 8 AM  -> same day 8 AM
 * - After 9 PM   -> next day 9 AM
 * - Saturday      -> Monday 9 AM
 * - Sunday        -> Monday 9 AM
 */
export function clampToBusinessHours(date: Date): Date {
  const result = new Date(date)
  const hour = result.getHours()
  const day = result.getDay() // 0=Sun, 6=Sat

  // Handle time-of-day clamping first
  if (hour < 8) {
    result.setHours(8, 0, 0, 0)
  } else if (hour >= 21) {
    // Push to 9 AM next day
    result.setDate(result.getDate() + 1)
    result.setHours(9, 0, 0, 0)
  }

  // Handle weekends — push to Monday 9 AM
  const adjustedDay = result.getDay()
  if (adjustedDay === 6) {
    // Saturday -> Monday
    result.setDate(result.getDate() + 2)
    result.setHours(9, 0, 0, 0)
  } else if (adjustedDay === 0) {
    // Sunday -> Monday
    result.setDate(result.getDate() + 1)
    result.setHours(9, 0, 0, 0)
  }

  return result
}
