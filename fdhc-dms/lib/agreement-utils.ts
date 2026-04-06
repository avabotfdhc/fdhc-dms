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

// ---------------------------------------------------------------------------
// Legal document generation (ported from prior version)
// ---------------------------------------------------------------------------

export type DocumentType = 'master_agreement' | 'addendum_a' | 'hud_disclosure' | 'state_disclosure'

/**
 * Generate a populated legal document from a template.
 *
 * Fetches the appropriate template from `purchase_agreement_templates`,
 * replaces all `{variable}` placeholders with agreement data, and returns
 * the rendered document text.
 */
export async function generateLegalDocument(
  supabase: SupabaseClient,
  agreementId: string,
  documentType: DocumentType,
  stateCode?: string,
): Promise<{ title: string; content: string }> {
  // Fetch agreement
  const { data: agreement } = await supabase
    .from('purchase_agreements')
    .select('*')
    .eq('id', agreementId)
    .single()

  if (!agreement) throw new Error(`Agreement not found: ${agreementId}`)

  // Fetch template
  let templateQuery = supabase
    .from('purchase_agreement_templates')
    .select('*')
    .eq('template_type', documentType)
    .eq('is_default', true)

  if (stateCode) {
    templateQuery = templateQuery.eq('state_code', stateCode)
  }

  const { data: templates } = await templateQuery
  const template = templates?.[0]

  if (!template) {
    // Fallback: fetch any default template of this type
    const { data: fallback } = await supabase
      .from('purchase_agreement_templates')
      .select('*')
      .eq('template_type', documentType)
      .eq('is_default', true)
      .is('state_code', null)
      .limit(1)
    if (!fallback?.[0]) throw new Error(`No template found for: ${documentType}`)
    return generateFromTemplate(fallback[0], agreement, supabase)
  }

  return generateFromTemplate(template, agreement, supabase)
}

async function generateFromTemplate(
  template: Record<string, unknown>,
  agreement: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<{ title: string; content: string }> {
  // Fetch state requirements for disclosures
  let stateReq: Record<string, unknown> | null = null
  if (agreement.client_state) {
    const { data } = await supabase
      .from('state_compliance_requirements')
      .select('*')
      .eq('state_code', agreement.client_state)
      .single()
    stateReq = data
  }

  // Fetch addendum A upgrades
  const { data: upgrades } = await supabase
    .from('addendum_a_upgrades')
    .select('*')
    .eq('agreement_id', agreement.id)
    .order('item_number')

  // Build upgrade table text
  let upgradeTable = ''
  let addendumTotal = 0
  if (upgrades && upgrades.length > 0) {
    upgradeTable = upgrades.map(u => {
      const price = Number(u.retail_price || 0) + Number(u.installation_cost || 0)
      addendumTotal += price
      return `${u.item_number}  ${u.description}  $${price.toLocaleString()}`
    }).join('\n')
  }

  const fmt = (v: unknown) => {
    if (v === null || v === undefined) return ''
    const n = Number(v)
    if (!isNaN(n) && typeof v !== 'boolean') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    return String(v)
  }

  // Build variable map
  const vars: Record<string, string> = {
    agreement_number: String(agreement.agreement_number || ''),
    agreement_date: agreement.agreement_date ? new Date(String(agreement.agreement_date)).toLocaleDateString() : '',
    client_first_name: String(agreement.client_first_name || ''),
    client_last_name: String(agreement.client_last_name || ''),
    client_address: String(agreement.client_address || ''),
    client_city: String(agreement.client_city || ''),
    client_state: String(agreement.client_state || ''),
    client_zip: String(agreement.client_zip || ''),
    client_phone: String(agreement.client_phone || ''),
    client_email: String(agreement.client_email || ''),
    manufacturer: String(agreement.manufacturer || ''),
    model_name: String(agreement.model_name || ''),
    serial_number: String(agreement.serial_number || ''),
    year: String(agreement.year || ''),
    base_home_price: fmt(agreement.base_home_price),
    factory_options_price: fmt(agreement.factory_options_price),
    freight_cost: fmt(agreement.freight_cost),
    setup_cost: fmt(agreement.setup_cost),
    site_prep_price: fmt(agreement.site_prep_price),
    sales_tax: fmt(agreement.sales_tax),
    tax_rate: stateReq ? `${(Number(stateReq.sales_tax_rate) * 100).toFixed(2)}%` : '',
    total_price: fmt(agreement.total_price),
    trade_in_value: fmt(agreement.trade_in_value),
    down_payment: fmt(agreement.down_payment),
    deposit_amount: fmt(agreement.deposit_amount),
    loan_amount: fmt(agreement.loan_amount),
    monthly_payment: fmt(agreement.monthly_payment),
    interest_rate: agreement.interest_rate ? `${agreement.interest_rate}` : '',
    term_months: String(agreement.term_months || ''),
    expected_delivery_date: agreement.expected_delivery_date ? new Date(String(agreement.expected_delivery_date)).toLocaleDateString() : '',
    site_address: String(agreement.site_address || ''),
    site_city: String(agreement.site_city || ''),
    site_state: String(agreement.site_state || ''),
    site_zip: String(agreement.site_zip || ''),
    special_terms: String(agreement.special_terms || 'None'),
    cooling_off_days: stateReq ? String(stateReq.cooling_off_period_days || 3) : '3',
    hud_standards: stateReq ? String(stateReq.hud_installation_code || '24 CFR 3285') : '24 CFR 3285',
    upgrade_table: upgradeTable || 'No optional upgrades selected.',
    addendum_a_total: `$${addendumTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
  }

  const content = populateTemplate(String(template.body_content || ''), vars)
  return {
    title: String(template.name || 'Document'),
    content,
  }
}

// ---------------------------------------------------------------------------
// Addendum A management (ported from prior version)
// ---------------------------------------------------------------------------

/**
 * Add an upgrade to a purchase agreement's Addendum A.
 * Auto-generates item number (A-001, A-002, etc.)
 */
export async function addUpgradeToAddendumA(
  supabase: SupabaseClient,
  agreementId: string,
  upgrade: {
    description: string
    category: string
    retailPrice: number
    dealerCost?: number
    installationCost?: number
    installedBy?: string
    manufacturer?: string
    modelNumber?: string
    warrantyPeriodMonths?: number
    warrantyDescription?: string
  },
) {
  // Get current count for item numbering
  const { count } = await supabase
    .from('addendum_a_upgrades')
    .select('*', { count: 'exact', head: true })
    .eq('agreement_id', agreementId)

  const itemNumber = `A-${String((count || 0) + 1).padStart(3, '0')}`

  const { data, error } = await supabase
    .from('addendum_a_upgrades')
    .insert({
      agreement_id: agreementId,
      item_number: itemNumber,
      description: upgrade.description,
      category: upgrade.category,
      retail_price: upgrade.retailPrice,
      dealer_cost: upgrade.dealerCost || 0,
      installation_cost: upgrade.installationCost || 0,
      installed_by: upgrade.installedBy || 'dealer',
      manufacturer: upgrade.manufacturer || null,
      model_number: upgrade.modelNumber || null,
      warranty_period_months: upgrade.warrantyPeriodMonths || 12,
      warranty_description: upgrade.warrantyDescription || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add upgrade: ${error.message}`)
  return data
}

/**
 * Remove an upgrade from Addendum A and recalculate totals.
 */
export async function removeUpgradeFromAddendumA(
  supabase: SupabaseClient,
  upgradeId: string,
) {
  const { error } = await supabase
    .from('addendum_a_upgrades')
    .delete()
    .eq('id', upgradeId)

  if (error) throw new Error(`Failed to remove upgrade: ${error.message}`)
}
