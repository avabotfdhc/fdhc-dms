/**
 * POST /api/webhooks/lead
 *
 * Public webhook endpoint for automated lead intake.
 * Accepts leads from:
 *   - Generic JSON (website forms, Zapier, Make, n8n)
 *   - Facebook Lead Ads format
 *   - Zillow / realtor.com format
 *
 * Authentication: API key in `x-api-key` header OR `api_key` query param.
 * Set LEAD_INTAKE_API_KEY in your environment variables.
 *
 * Example curl:
 *   curl -X POST https://your-domain.com/api/webhooks/lead \
 *     -H "x-api-key: YOUR_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"first_name":"Jane","last_name":"Doe","email":"jane@example.com","phone":"555-1234","source":"website"}'
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { assignLead, type LandStatus } from '@/lib/lead-routing'
import { handleNewLead } from '@/lib/sequence-triggers'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateApiKey(request: Request): boolean {
  const configured = process.env.LEAD_INTAKE_API_KEY
  if (!configured) {
    // If no key is configured, reject all requests for security
    return false
  }
  const fromHeader = request.headers.get('x-api-key')
  const url = new URL(request.url)
  const fromQuery = url.searchParams.get('api_key')
  return fromHeader === configured || fromQuery === configured
}

interface NormalizedLead {
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  source: string
  land_status: LandStatus
  notes: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  raw: Record<string, unknown>
}

/**
 * Normalize various incoming payload formats into a consistent shape.
 */
function normalizeLead(body: Record<string, unknown>): NormalizedLead | null {
  // ---- Facebook Lead Ads format ----------------------------------------
  // Facebook sends: { field_data: [{ name: "full_name", values: ["Jane Doe"] }] }
  if (Array.isArray(body.field_data)) {
    const fields: Record<string, string> = {}
    for (const f of body.field_data as Array<{ name: string; values: string[] }>) {
      fields[f.name] = f.values?.[0] || ''
    }
    const fullName = (fields.full_name || `${fields.first_name || ''} ${fields.last_name || ''}`).trim()
    const parts = fullName.split(' ')
    return {
      first_name: fields.first_name || parts[0] || 'Unknown',
      last_name: fields.last_name || parts.slice(1).join(' ') || '',
      email: fields.email || null,
      phone: fields.phone_number || fields.phone || null,
      source: 'facebook',
      land_status: (fields.land_status as LandStatus) || 'unknown',
      notes: fields.comments || fields.message || null,
      address: fields.street_address || null,
      city: fields.city || null,
      state: fields.state || null,
      zip: fields.zip_code || fields.zip || null,
      raw: body,
    }
  }

  // ---- Zillow / realtor.com format ------------------------------------
  // Zillow sends: { contact: { firstName, lastName, email, phone } }
  if (body.contact && typeof body.contact === 'object') {
    const c = body.contact as Record<string, string>
    return {
      first_name: c.firstName || c.first_name || 'Unknown',
      last_name: c.lastName || c.last_name || '',
      email: c.email || null,
      phone: c.phone || c.phoneNumber || null,
      source: (body.source as string) || 'zillow',
      land_status: 'unknown',
      notes: (body.message as string) || null,
      address: null,
      city: (body.city as string) || null,
      state: (body.state as string) || null,
      zip: null,
      raw: body,
    }
  }

  // ---- Generic / flat format ------------------------------------------
  const firstName = (body.first_name || body.firstName || body.fname || '') as string
  const lastName = (body.last_name || body.lastName || body.lname || '') as string

  // Handle "name" field split
  let resolvedFirst = firstName
  let resolvedLast = lastName
  if (!firstName && !lastName && body.name) {
    const parts = String(body.name).trim().split(' ')
    resolvedFirst = parts[0] || 'Unknown'
    resolvedLast = parts.slice(1).join(' ') || ''
  }

  if (!resolvedFirst) return null

  return {
    first_name: resolvedFirst,
    last_name: resolvedLast,
    email: (body.email as string) || null,
    phone: (body.phone || body.phone_number || body.phoneNumber || body.mobile) as string | null,
    source: (body.source || body.lead_source || body.leadSource || 'webhook') as string,
    land_status: ((body.land_status || body.landStatus || 'unknown') as LandStatus),
    notes: (body.notes || body.message || body.comments) as string | null,
    address: (body.address || body.street_address) as string | null,
    city: (body.city) as string | null,
    state: (body.state) as string | null,
    zip: (body.zip || body.zip_code || body.postal_code) as string | null,
    raw: body,
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Authenticate
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Invalid or missing API key. Set x-api-key header.' },
      { status: 401 },
    )
  }

  // 2. Parse body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // 3. Normalize
  const lead = normalizeLead(body)
  if (!lead || !lead.first_name) {
    return NextResponse.json(
      { error: 'Could not extract first_name from payload' },
      { status: 400 },
    )
  }

  const supabase = createServiceClient()

  // 4. Deduplicate by email or phone
  if (lead.email || lead.phone) {
    let dupQuery = supabase.from('clients').select('id').limit(1)
    if (lead.email) {
      dupQuery = dupQuery.eq('email', lead.email)
    } else if (lead.phone) {
      dupQuery = dupQuery.eq('phone', lead.phone)
    }
    const { data: existing } = await dupQuery.maybeSingle()
    if (existing) {
      return NextResponse.json(
        { message: 'Duplicate lead — client already exists', client_id: existing.id },
        { status: 200 },
      )
    }
  }

  // 5. Create client
  const { data: client, error: insertError } = await supabase
    .from('clients')
    .insert({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: 'lead',
      land_status: lead.land_status,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zip: lead.zip,
      notes: lead.notes,
      contact_attempts: 0,
      interactions: [],
    })
    .select('id, first_name, last_name, email, phone')
    .single()

  if (insertError || !client) {
    return NextResponse.json(
      { error: insertError?.message || 'Failed to create client' },
      { status: 500 },
    )
  }

  // 6. Round-robin assignment
  let assignment = { assignedTo: '', repName: 'Manager Review Queue' }
  try {
    assignment = await assignLead(supabase, {
      clientId: client.id,
      landStatus: lead.land_status,
    })
  } catch (err) {
    console.error('[webhook] Lead assignment failed:', err)
  }

  // 7. Enroll in New Lead follow-up sequence
  try {
    await handleNewLead(supabase, client.id)
  } catch (err) {
    console.error('[webhook] Sequence enrollment failed:', err)
  }

  return NextResponse.json(
    {
      success: true,
      client_id: client.id,
      assigned_to: assignment.assignedTo || null,
      assigned_rep: assignment.repName,
    },
    { status: 201 },
  )
}

// Support GET for webhook verification (Facebook, etc.)
export async function GET(request: Request) {
  const url = new URL(request.url)
  // Facebook webhook verification challenge
  const challenge = url.searchParams.get('hub.challenge')
  const verify = url.searchParams.get('hub.verify_token')

  if (challenge && verify && verify === process.env.LEAD_INTAKE_API_KEY) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json(
    { status: 'Lead intake webhook is active. Send POST requests with x-api-key header.' },
    { status: 200 },
  )
}
