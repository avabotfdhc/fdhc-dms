/**
 * POST /api/leads/import
 *
 * Bulk import leads from the authenticated CSV import UI.
 * Accepts an array of lead objects, creates clients, and assigns
 * each one via round-robin.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assignLead, type LandStatus } from '@/lib/lead-routing'
import { handleNewLead } from '@/lib/sequence-triggers'

interface LeadRow {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  source?: string
  land_status?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  notes?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let rows: LeadRow[]
  try {
    const body = await request.json()
    rows = Array.isArray(body.leads) ? body.leads : []
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
  }

  if (rows.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 leads per import' }, { status: 400 })
  }

  const results = {
    imported: 0,
    skipped: 0,
    errors: 0,
    details: [] as Array<{ row: number; status: 'imported' | 'skipped' | 'error'; reason?: string; client_id?: string }>,
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    if (!row.first_name?.trim()) {
      results.errors++
      results.details.push({ row: i + 1, status: 'error', reason: 'Missing first_name' })
      continue
    }

    // Deduplicate by email or phone
    if (row.email || row.phone) {
      let dupQuery = supabase.from('clients').select('id').limit(1)
      if (row.email) {
        dupQuery = dupQuery.eq('email', row.email.trim().toLowerCase())
      } else if (row.phone) {
        dupQuery = dupQuery.eq('phone', row.phone.trim())
      }
      const { data: existing } = await dupQuery.maybeSingle()
      if (existing) {
        results.skipped++
        results.details.push({ row: i + 1, status: 'skipped', reason: 'Duplicate email/phone', client_id: existing.id })
        continue
      }
    }

    const { data: client, error: insertError } = await supabase
      .from('clients')
      .insert({
        first_name: row.first_name.trim(),
        last_name: (row.last_name || '').trim(),
        email: row.email?.trim().toLowerCase() || null,
        phone: row.phone?.trim() || null,
        source: row.source?.trim() || 'import',
        status: 'lead',
        land_status: row.land_status || 'unknown',
        address: row.address?.trim() || null,
        city: row.city?.trim() || null,
        state: row.state?.trim() || null,
        zip: row.zip?.trim() || null,
        notes: row.notes?.trim() || null,
        contact_attempts: 0,
        interactions: [],
      })
      .select('id')
      .single()

    if (insertError || !client) {
      results.errors++
      results.details.push({ row: i + 1, status: 'error', reason: insertError?.message || 'Insert failed' })
      continue
    }

    // Round-robin assign
    try {
      await assignLead(supabase, {
        clientId: client.id,
        landStatus: (row.land_status || 'unknown') as LandStatus,
      })
    } catch {
      // Non-fatal
    }

    // Enroll in New Lead sequence
    try {
      await handleNewLead(supabase, client.id)
    } catch {
      // Non-fatal
    }

    results.imported++
    results.details.push({ row: i + 1, status: 'imported', client_id: client.id })
  }

  return NextResponse.json(results)
}
