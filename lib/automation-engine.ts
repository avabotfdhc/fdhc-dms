// ---------------------------------------------------------------------------
// Follow-up automation rule engine
// ---------------------------------------------------------------------------

import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivityOutcomeInput {
  clientId: string
  activityType: string
  outcome: string
  assignedTo: string
}

interface FollowUpRule {
  id: string
  trigger_activity_type: string
  trigger_outcome: string
  follow_up_activity_type: string
  delay_minutes: number
  delay_days: number
  priority: string | null
  notes_template: string | null
}

interface ScheduledFollowUp {
  client_id: string
  assigned_to: string
  activity_type: string
  scheduled_at: string
  status: string
  priority: string | null
  notes: string | null
  source_rule_id: string
}

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

/**
 * Process an activity outcome and schedule any matching follow-ups.
 *
 * Algorithm:
 *   1. Query `follow_up_rules` where `trigger_activity_type` matches the
 *      completed activity (or is set to `'any'`) AND `trigger_outcome`
 *      matches.
 *   2. For each matching rule, compute `scheduled_at` by adding the rule's
 *      `delay_minutes` and `delay_days` to the current timestamp.
 *   3. Insert a row into `scheduled_follow_ups` for each match.
 *   4. Update `client.next_follow_up_at` to the earliest pending follow-up
 *      for that client.
 */
export async function processActivityOutcome(
  supabase: SupabaseClient,
  input: ActivityOutcomeInput,
): Promise<void> {
  const { clientId, activityType, outcome, assignedTo } = input

  // Step 1: find matching rules
  // We need rules where trigger_activity_type is either the exact type or 'any',
  // AND trigger_outcome matches.
  const { data: rules, error: rulesError } = await supabase
    .from('follow_up_rules')
    .select('*')
    .in('trigger_activity_type', [activityType, 'any'])
    .eq('trigger_outcome', outcome)

  if (rulesError) {
    throw new Error(`Failed to query follow-up rules: ${rulesError.message}`)
  }

  if (!rules || rules.length === 0) {
    // No matching rules — nothing to schedule
    return
  }

  // Step 2-3: build and insert scheduled follow-ups
  const now = new Date()
  const followUps: ScheduledFollowUp[] = (rules as FollowUpRule[]).map(
    (rule) => {
      const scheduledAt = new Date(now)
      scheduledAt.setMinutes(scheduledAt.getMinutes() + (rule.delay_minutes || 0))
      scheduledAt.setDate(scheduledAt.getDate() + (rule.delay_days || 0))

      return {
        client_id: clientId,
        assigned_to: assignedTo,
        activity_type: rule.follow_up_activity_type,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
        priority: rule.priority || null,
        notes: rule.notes_template || null,
        source_rule_id: rule.id,
      }
    },
  )

  const { error: insertError } = await supabase
    .from('scheduled_follow_ups')
    .insert(followUps)

  if (insertError) {
    throw new Error(
      `Failed to insert scheduled follow-ups: ${insertError.message}`,
    )
  }

  // Step 4: update client's next_follow_up_at to earliest pending
  const { data: earliest, error: earliestError } = await supabase
    .from('scheduled_follow_ups')
    .select('scheduled_at')
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (earliestError) {
    throw new Error(
      `Failed to query earliest follow-up: ${earliestError.message}`,
    )
  }

  if (earliest) {
    const { error: updateError } = await supabase
      .from('clients')
      .update({ next_follow_up_at: earliest.scheduled_at })
      .eq('id', clientId)

    if (updateError) {
      throw new Error(
        `Failed to update client next_follow_up_at: ${updateError.message}`,
      )
    }
  }
}
