// ---------------------------------------------------------------------------
// Sequence triggers — auto-enroll clients based on CRM events
// ---------------------------------------------------------------------------

import type { SupabaseClient } from '@supabase/supabase-js'
import { enrollInSequence, cancelSequence } from '@/lib/sequence-engine'

// ---------------------------------------------------------------------------
// Trigger: new lead created
// ---------------------------------------------------------------------------

/**
 * When a new lead enters the system, find and enroll them in the active
 * "new_lead" sequence.
 */
export async function handleNewLead(
  supabase: SupabaseClient,
  clientId: string,
): Promise<void> {
  const { data: sequence, error } = await supabase
    .from('sequences')
    .select('id')
    .eq('trigger_type', 'new_lead')
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to find new-lead sequence: ${error.message}`)
  }

  if (sequence) {
    await enrollInSequence(supabase, clientId, sequence.id)
  }
}

// ---------------------------------------------------------------------------
// Trigger: deal status change
// ---------------------------------------------------------------------------

/**
 * When a deal status changes, cancel conflicting enrollments and enroll in the
 * appropriate status-change sequence.
 */
export async function handleDealStatusChange(
  supabase: SupabaseClient,
  clientId: string,
  newStatus: string,
): Promise<void> {
  // Normalise status to a trigger_value
  const normalized = newStatus.toLowerCase()
  let triggerValue: string | null = null

  if (normalized === 'sold' || normalized === 'delivered') {
    triggerValue = 'sold'
  } else if (normalized === 'lost' || normalized === 'dead') {
    triggerValue = 'lost'
  } else if (normalized === 'application' || normalized === 'pending') {
    triggerValue = 'application'
  }

  if (!triggerValue) {
    return // status does not map to any sequence trigger
  }

  // Cancel any active enrollments for this client that would conflict
  const { data: activeEnrollments, error: enrollError } = await supabase
    .from('sequence_enrollments')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'active')

  if (enrollError) {
    throw new Error(
      `Failed to query active enrollments: ${enrollError.message}`,
    )
  }

  if (activeEnrollments) {
    for (const enrollment of activeEnrollments) {
      await cancelSequence(
        supabase,
        enrollment.id,
        `Status changed to ${newStatus}`,
      )
    }
  }

  // Find the matching status-change sequence
  const { data: sequence, error: seqError } = await supabase
    .from('sequences')
    .select('id')
    .eq('trigger_type', 'status_change')
    .eq('trigger_value', triggerValue)
    .eq('is_active', true)
    .maybeSingle()

  if (seqError) {
    throw new Error(
      `Failed to find status-change sequence: ${seqError.message}`,
    )
  }

  if (sequence) {
    await enrollInSequence(supabase, clientId, sequence.id)
  }
}

// ---------------------------------------------------------------------------
// Trigger: appointment scheduled
// ---------------------------------------------------------------------------

/**
 * When an appointment is scheduled, enroll the client in the appointment
 * reminder sequence. Steps typically use negative delays relative to the
 * appointment date.
 */
export async function handleAppointmentScheduled(
  supabase: SupabaseClient,
  clientId: string,
  _appointmentDate: string,
): Promise<void> {
  const { data: sequence, error } = await supabase
    .from('sequences')
    .select('id')
    .eq('trigger_type', 'appointment')
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw new Error(
      `Failed to find appointment sequence: ${error.message}`,
    )
  }

  if (sequence) {
    await enrollInSequence(supabase, clientId, sequence.id)
  }
}

// ---------------------------------------------------------------------------
// Trigger: delivery scheduled
// ---------------------------------------------------------------------------

/**
 * When a delivery date is set, enroll the client in the delivery countdown
 * sequence. Steps use negative delays relative to the delivery date.
 */
export async function handleDeliveryScheduled(
  supabase: SupabaseClient,
  clientId: string,
  _deliveryDate: string,
): Promise<void> {
  const { data: sequence, error } = await supabase
    .from('sequences')
    .select('id')
    .eq('trigger_type', 'delivery')
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to find delivery sequence: ${error.message}`)
  }

  if (sequence) {
    await enrollInSequence(supabase, clientId, sequence.id)
  }
}

// ---------------------------------------------------------------------------
// Trigger: birthday check (batch)
// ---------------------------------------------------------------------------

/**
 * Query all clients whose date_of_birth month/day matches today and enroll
 * them in the birthday sequence. Intended to be called by a daily cron.
 */
export async function checkBirthdays(
  supabase: SupabaseClient,
): Promise<{ enrolled: number }> {
  const today = new Date()
  const month = today.getMonth() + 1 // 1-indexed
  const day = today.getDate()

  // Pad to 2-digit strings for text matching
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')

  // Find clients whose date_of_birth ends with -MM-DD
  // (the column is stored as a date string like YYYY-MM-DD)
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id')
    .like('date_of_birth', `%-${mm}-${dd}`)

  if (clientsError) {
    throw new Error(`Failed to query birthdays: ${clientsError.message}`)
  }

  if (!clients || clients.length === 0) {
    return { enrolled: 0 }
  }

  // Find the birthday sequence
  const { data: sequence, error: seqError } = await supabase
    .from('sequences')
    .select('id')
    .eq('trigger_type', 'birthday')
    .eq('is_active', true)
    .maybeSingle()

  if (seqError) {
    throw new Error(`Failed to find birthday sequence: ${seqError.message}`)
  }

  if (!sequence) {
    return { enrolled: 0 }
  }

  let enrolled = 0
  for (const client of clients) {
    await enrollInSequence(supabase, client.id, sequence.id)
    enrolled++
  }

  return { enrolled }
}
