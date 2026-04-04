// ---------------------------------------------------------------------------
// Purchase agreement utilities
// ---------------------------------------------------------------------------

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Disclosure, StateCompliance } from '@/lib/tax-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PurchaseAgreementData {
  agreementNumber: string
  dealId: string
  /** Buyer information */
  buyer: {
    name: string
    email: string | null
    phone: string | null
    address: string | null
  }
  /** Co-buyer, if any */
  coBuyer: {
    name: string
    address: string | null
  } | null
  /** Home / model details */
  model: {
    manufacturer: string | null
    modelName: string | null
    modelNumber: string | null
    serialNumber: string | null
    year: string | null
    bedrooms: string | null
    bathrooms: string | null
    squareFeet: string | null
    width: string | null
    length: string | null
  }
  /** Financial breakdown */
  financials: {
    salePrice: number
    options: number
    freight: number
    setup: number
    sitePrep: number
    totalCost: number
    downPayment: number
    tradeIn: number
    amountFinanced: number
    interestRate: number
    termMonths: number
    monthlyPayment: number
    totalInterest: number
  }
  /** Delivery address */
  deliveryAddress: string | null
  /** Date the agreement was generated */
  generatedAt: string
}

// ---------------------------------------------------------------------------
// Agreement number generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique agreement number in the format YYYY-XXXX.
 *
 * The sequential portion is derived from the current timestamp to provide a
 * monotonically increasing value within the year. For production use with
 * high concurrency, consider a database sequence instead.
 */
export function generateAgreementNumber(): string {
  const now = new Date()
  const year = now.getFullYear()

  // Use the last 4 digits of epoch milliseconds for uniqueness within a year.
  // In practice a Supabase sequence column would be preferred.
  const seq = String(now.getTime() % 10000).padStart(4, '0')

  return `${year}-${seq}`
}

// ---------------------------------------------------------------------------
// Template population
// ---------------------------------------------------------------------------

/**
 * Replace `{variable}` placeholders in a template string with provided data.
 *
 * Missing variables are replaced with empty strings.
 *
 * @example
 * populateTemplate('Dear {buyer_name},', { buyer_name: 'Jane Doe' })
 * // → 'Dear Jane Doe,'
 */
export function populateTemplate(
  template: string,
  data: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return data[key] ?? ''
  })
}

// ---------------------------------------------------------------------------
// Auto-populate from deal
// ---------------------------------------------------------------------------

/**
 * Pull all relevant data for a purchase agreement from a deal record and its
 * associated client and model information.
 *
 * Queries the `agreements` table (joined to `clients`) by deal ID, then
 * assembles a structured `PurchaseAgreementData` object suitable for
 * template rendering or PDF generation.
 */
export async function autoPopulateAgreement(
  supabase: SupabaseClient,
  dealId: string,
): Promise<PurchaseAgreementData> {
  const { data: deal, error } = await supabase
    .from('agreements')
    .select('*, clients(first_name, last_name, email, phone, address, delivery_address, delivery_city, delivery_state, delivery_zip)')
    .eq('id', dealId)
    .single()

  if (error || !deal) {
    throw new Error(
      error?.message || `Deal not found: ${dealId}`,
    )
  }

  const client = (deal.clients as Record<string, string | null>) || {}
  const buyerJson = (deal.buyer as Record<string, string>) || {}
  const buyer2Json = (deal.buyer2 as Record<string, string>) || {}
  const modelJson = (deal.model as Record<string, string>) || {}
  const fin = (deal.financials as Record<string, number | string>) || {}

  const buyerName =
    buyerJson.name ||
    [client.first_name, client.last_name].filter(Boolean).join(' ') ||
    ''

  const deliveryParts = [
    client.delivery_address,
    client.delivery_city,
    client.delivery_state,
    client.delivery_zip,
  ].filter(Boolean)

  const toNum = (v: unknown): number => Number(v) || 0

  const salePrice = toNum(fin.sale_price)
  const options = toNum(fin.options)
  const freight = toNum(fin.freight)
  const setup = toNum(fin.setup)
  const sitePrep = toNum(fin.site_prep)
  const totalCost = toNum(fin.total) || salePrice + options + freight + setup + sitePrep
  const downPayment = toNum(fin.down_payment)
  const tradeIn = toNum(fin.trade_in)
  const amountFinanced = toNum(fin.amount_financed) || Math.max(0, totalCost - downPayment - tradeIn)
  const interestRate = toNum(fin.interest_rate)
  const termMonths = toNum(fin.term)
  const monthlyPayment = toNum(fin.monthly_payment)
  const totalInterest = toNum(fin.total_interest) || Math.max(0, monthlyPayment * termMonths - amountFinanced)

  return {
    agreementNumber: deal.deal_number || generateAgreementNumber(),
    dealId,
    buyer: {
      name: buyerName,
      email: client.email || null,
      phone: client.phone || null,
      address: buyerJson.address || client.address || null,
    },
    coBuyer:
      buyer2Json.name
        ? { name: buyer2Json.name, address: buyer2Json.address || null }
        : null,
    model: {
      manufacturer: modelJson.manufacturer || null,
      modelName: modelJson.model_name || modelJson.name || null,
      modelNumber: modelJson.model_number || null,
      serialNumber: modelJson.serial_number || null,
      year: modelJson.year || null,
      bedrooms: modelJson.bedrooms || null,
      bathrooms: modelJson.bathrooms || null,
      squareFeet: modelJson.square_feet || modelJson.sq_ft || null,
      width: modelJson.width || null,
      length: modelJson.length || null,
    },
    financials: {
      salePrice,
      options,
      freight,
      setup,
      sitePrep,
      totalCost,
      downPayment,
      tradeIn,
      amountFinanced,
      interestRate,
      termMonths,
      monthlyPayment,
      totalInterest,
    },
    deliveryAddress: deliveryParts.length > 0 ? deliveryParts.join(', ') : null,
    generatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Required disclosures
// ---------------------------------------------------------------------------

/**
 * Return the list of disclosures required for a given state.
 *
 * If the state compliance record has no disclosures, returns an empty array.
 * The `stateCode` parameter is accepted for future use (e.g. fetching
 * federal disclosures that apply to all states).
 */
export function getRequiredDisclosures(
  _stateCode: string,
  stateRequirements: StateCompliance | null,
): Disclosure[] {
  if (!stateRequirements?.required_disclosures) return []
  return stateRequirements.required_disclosures
}
