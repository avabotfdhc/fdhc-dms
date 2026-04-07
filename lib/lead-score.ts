/**
 * Lead Scoring Engine
 *
 * Scores a client 0–100 based on profile completeness, engagement,
 * and behavioral signals — inspired by Reynolds & Reynolds Prospect AI
 * and CDK's lead prioritization.
 *
 * Score bands:
 *   80–100  🔥 Hot
 *   60–79   ⚡ Warm
 *   40–59   👀 Interested
 *   0–39    ❄️ Cold
 */

export interface LeadScoreInput {
  status: string
  land_status: string | null
  source: string | null
  contact_attempts: number
  interactions: unknown[]
  created_at: string
  email: string | null
  phone: string | null
  has_deal: boolean
  next_follow_up_at: string | null
  tags: string[] | null
}

export interface LeadScoreResult {
  score: number
  band: 'hot' | 'warm' | 'interested' | 'cold'
  label: string
  emoji: string
  color: string        // Tailwind text color
  bg: string           // Tailwind bg color
  breakdown: Array<{ reason: string; points: number }>
}

export function scoreLeadClient(client: LeadScoreInput): LeadScoreResult {
  const breakdown: Array<{ reason: string; points: number }> = []
  let score = 0

  // ── Profile completeness ─────────────────────────────────
  if (client.email) { score += 5; breakdown.push({ reason: 'Has email', points: 5 }) }
  if (client.phone) { score += 5; breakdown.push({ reason: 'Has phone', points: 5 }) }

  // ── Land status (land-home = highest intent) ─────────────
  if (client.land_status === 'owns_land') {
    score += 25; breakdown.push({ reason: 'Owns land — high intent', points: 25 })
  } else if (client.land_status === 'buying_land') {
    score += 20; breakdown.push({ reason: 'Buying land — strong intent', points: 20 })
  } else if (client.land_status === 'renting_lot') {
    score += 10; breakdown.push({ reason: 'Renting lot — moderate intent', points: 10 })
  } else if (client.land_status === 'needs_land') {
    score += 5; breakdown.push({ reason: 'Needs land — early stage', points: 5 })
  }

  // ── Lead source quality ──────────────────────────────────
  const highValueSources = ['referral', 'walk_in', 'return_customer']
  const medValueSources  = ['website', 'facebook', 'mhvillage']
  const src = (client.source || '').toLowerCase()
  if (highValueSources.some(s => src.includes(s))) {
    score += 15; breakdown.push({ reason: 'High-quality source (referral/walk-in)', points: 15 })
  } else if (medValueSources.some(s => src.includes(s))) {
    score += 8; breakdown.push({ reason: 'Online lead source', points: 8 })
  }

  // ── Engagement / contact attempts ────────────────────────
  const attempts = Math.min(client.contact_attempts || 0, 5)
  if (attempts > 0) {
    const pts = attempts * 4
    score += pts
    breakdown.push({ reason: `${attempts} contact attempts`, points: pts })
  }

  // ── Interaction depth ────────────────────────────────────
  const interactions = Array.isArray(client.interactions) ? client.interactions : []
  const interactionScore = Math.min(interactions.length * 3, 15)
  if (interactionScore > 0) {
    breakdown.push({ reason: `${interactions.length} interactions logged`, points: interactionScore })
    score += interactionScore
  }

  // ── Positive outcome signals ─────────────────────────────
  const goodOutcomes = ['appointment_set', 'deal_made', 'connected', 'callback_requested']
  const goodCount = interactions.filter((i: any) => goodOutcomes.includes(i?.outcome)).length
  if (goodCount > 0) {
    const pts = Math.min(goodCount * 5, 15)
    score += pts
    breakdown.push({ reason: `${goodCount} positive interaction outcomes`, points: pts })
  }

  // ── Recency (decay over time) ────────────────────────────
  const daysSince = Math.floor(
    (Date.now() - new Date(client.created_at).getTime()) / 86_400_000
  )
  if (daysSince > 60) {
    const decay = Math.min(Math.floor((daysSince - 60) / 7) * 2, 20)
    score -= decay
    if (decay > 0) breakdown.push({ reason: `${daysSince}d old (recency decay)`, points: -decay })
  }

  // ── Status boosts ────────────────────────────────────────
  if (client.status === 'active') {
    score += 10; breakdown.push({ reason: 'Active status', points: 10 })
  }

  // ── Has active deal ──────────────────────────────────────
  if (client.has_deal) {
    score += 20; breakdown.push({ reason: 'Active deal in progress', points: 20 })
  }

  // ── Follow-up scheduled ──────────────────────────────────
  if (client.next_follow_up_at && new Date(client.next_follow_up_at) > new Date()) {
    score += 5; breakdown.push({ reason: 'Follow-up scheduled', points: 5 })
  }

  // ── Tags ─────────────────────────────────────────────────
  const hotTags = ['hot', 'vip', 'urgent', 'ready_to_buy']
  if ((client.tags || []).some(t => hotTags.includes(t.toLowerCase()))) {
    score += 10; breakdown.push({ reason: 'Tagged as hot/VIP', points: 10 })
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score))

  let band: LeadScoreResult['band']
  let label: string
  let emoji: string
  let color: string
  let bg: string

  if (score >= 80) {
    band = 'hot'; label = 'Hot'; emoji = '🔥'
    color = 'text-red-700'; bg = 'bg-red-100'
  } else if (score >= 60) {
    band = 'warm'; label = 'Warm'; emoji = '⚡'
    color = 'text-amber-700'; bg = 'bg-amber-100'
  } else if (score >= 40) {
    band = 'interested'; label = 'Interested'; emoji = '👀'
    color = 'text-blue-700'; bg = 'bg-blue-100'
  } else {
    band = 'cold'; label = 'Cold'; emoji = '❄️'
    color = 'text-slate-500'; bg = 'bg-slate-100'
  }

  return { score, band, label, emoji, color, bg, breakdown }
}
