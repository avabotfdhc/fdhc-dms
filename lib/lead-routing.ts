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
    throw new Error(
      needsLandHomeRep
        ? 'No active land-home reps available for round-robin assignment'
        : 'No active reps available for round-robin assignment',
    )
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
