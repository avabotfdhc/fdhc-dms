import { createClient } from '@/lib/supabase/server'
import { assignLead, type LandStatus } from '@/lib/lead-routing'
import { processActivityOutcome } from '@/lib/automation-engine'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { first_name, last_name, email, phone, source, land_status } = body

    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: 'first_name and last_name are required' },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    // Create client record
    const { data: client, error: insertError } = await supabase
      .from('clients')
      .insert({
        first_name,
        last_name,
        email: email || null,
        phone: phone || null,
        source: source || 'website',
        status: 'lead',
        land_status: land_status || 'unknown',
        contact_attempts: 0,
        interactions: [],
      })
      .select('*')
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      )
    }

    // Assign lead via round-robin
    let assignment = null
    try {
      assignment = await assignLead(supabase, {
        clientId: client.id,
        landStatus: (land_status || 'unknown') as LandStatus,
      })
    } catch (err) {
      // Non-fatal: assignment fails if no reps configured
      console.error('Lead assignment failed:', err)
    }

    // Trigger automation for new lead
    try {
      await processActivityOutcome(supabase, {
        clientId: client.id,
        activityType: 'status_change',
        outcome: 'new',
        assignedTo: assignment?.assignedTo || '',
      })
    } catch (err) {
      // Non-fatal
      console.error('Automation trigger failed:', err)
    }

    return NextResponse.json({
      client: {
        ...client,
        assigned_to: assignment?.assignedTo || null,
        assigned_rep_name: assignment?.repName || null,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
