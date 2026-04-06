// ---------------------------------------------------------------------------
// Round-robin lead assignment
// ---------------------------------------------------------------------------

import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LandStatus =
  | 'owns_land'
  | 'buying_land'
  | 'needs_land'
  | 'renting_lot'
  | 'unknown'

export interface AssignLeadInput {
  clientId: string
  landStatus: LandStatus
}

export interface AssignLeadResult {
  assignedTo: string
  repName: string
}

interface ProfileRow {
  id: string
  name: string | null
  username: string | null
  role: string
  handles_land_home: boolean | null
  last_assignment_at: string | null
}

// ---------------------------------------------------------------------------
// Core assignment logic
// ---------------------------------------------------------------------------

/**
 * Assign a lead to the next available sales rep using round-robin.
 *
 * Algorithm:
 *   1. If the client's land status is `owns_land` or `buying_land`, only
 *      consider reps flagged with `handles_land_home = true`.
 *   2. Query active reps (`is_active = true`, `round_robin_active = true`,
 *      role in `admin` or `user`).
 *   3. Sort by `last_assignment_at` ascending (least-recently-assigned first).
 *   4. Pick the first rep, update their `last_assignment_at`, and set
 *      `client.assigned_to`.
 *   5. Return the assigned rep's id and display name.
 *
 * Throws if no eligible reps are found.
 */
export async function assignLead(
  supabase: SupabaseClient,
  input: AssignLeadInput,
): Promise<AssignLeadResult> {
  const { clientId, landStatus } = input

  // Step 1-2: build query for eligible reps
  let query = supabase
    .from('profiles')
    .select('id, name, username, role, handles_land_home, last_assignment_at')
    .eq('is_active', true)
    .eq('round_robin_active', true)
    .in('role', ['admin', 'user'])
    .order('last_assignment_at', { ascending: true, nullsFirst: true })

  // Step 1: land-home filter
  const needsLandHomeRep =
    landStatus === 'owns_land' || landStatus === 'buying_land'
  if (needsLandHomeRep) {
    query = query.eq('handles_land_home', true)
  }

  const { data: reps, error: repsError } = await query

  if (repsError) {
    throw new Error(`Failed to query reps: ${repsError.message}`)
  }

  if (!reps || reps.length === 0) {
    // Manager queue fallback — leave unassigned for manager review
    return assignToManagerQueue(supabase, clientId)
  }

  // Step 3-4: pick the least-recently-assigned rep
  const chosen = reps[0] as ProfileRow
  const repName = chosen.name || chosen.username || 'Unknown'
  const now = new Date().toISOString()

  // Update rep's last assignment timestamp
  const { error: updateRepError } = await supabase
    .from('profiles')
    .update({ last_assignment_at: now })
    .eq('id', chosen.id)

  if (updateRepError) {
    throw new Error(`Failed to update rep timestamp: ${updateRepError.message}`)
  }

  // Update client's assigned_to
  const { error: updateClientError } = await supabase
    .from('clients')
    .update({ assigned_to: chosen.id })
    .eq('id', clientId)

  if (updateClientError) {
    throw new Error(
      `Failed to assign client: ${updateClientError.message}`,
    )
  }

  return {
    assignedTo: chosen.id,
    repName,
  }
}

// ---------------------------------------------------------------------------
// Manager queue fallback
// ---------------------------------------------------------------------------

async function assignToManagerQueue(
  supabase: SupabaseClient,
  clientId: string,
): Promise<AssignLeadResult> {
  // Leave client unassigned — manager will review and assign manually
  await supabase
    .from('clients')
    .update({ assigned_to: null, status: 'New' })
    .eq('id', clientId)

  return {
    assignedTo: '',
    repName: 'Manager Review Queue',
  }
}

// ---------------------------------------------------------------------------
// Activity logging (server-side)
// ---------------------------------------------------------------------------

export type ActivityType =
  | 'phone_call'
  | 'email'
  | 'sms'
  | 'appointment'
  | 'site_visit'
  | 'desking'
  | 'note'
  | 'status_change'

export type ActivityOutcome =
  | 'no_answer'
  | 'voicemail'
  | 'connected'
  | 'appointment_set'
  | 'not_interested'
  | 'callback_requested'
  | 'follow_up_later'
  | 'deal_made'
  | null

export interface LogActivityInput {
  clientId: string
  userId?: string
  dealId?: string
  type: ActivityType
  direction?: 'inbound' | 'outbound'
  outcome?: ActivityOutcome
  notes?: string
  durationSeconds?: number
  scheduledAt?: string
}

/**
 * Log an activity/interaction for a client.
 * - Appends to client.interactions jsonb array
 * - Updates contact_attempts and last_contact_at
 * - Returns the updated interactions array
 */
export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput,
) {
  const { clientId, type, direction, outcome, notes, durationSeconds, scheduledAt } = input

  // Fetch current interactions
  const { data: client } = await supabase
    .from('clients')
    .select('interactions, contact_attempts')
    .eq('id', clientId)
    .single()

  const interactions: Record<string, unknown>[] = Array.isArray(client?.interactions) ? client.interactions : []
  const contactAttempts = (client?.contact_attempts || 0) + 1

  // Append new interaction
  interactions.push({
    type,
    direction: direction || 'outbound',
    outcome: outcome || null,
    notes: notes || '',
    duration_seconds: durationSeconds || null,
    scheduled_at: scheduledAt || null,
    date: new Date().toISOString(),
  })

  // Update client
  await supabase
    .from('clients')
    .update({
      interactions,
      contact_attempts: contactAttempts,
      last_contact_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  return interactions
}

// ---------------------------------------------------------------------------
// Utility: format phone number
// ---------------------------------------------------------------------------

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}
