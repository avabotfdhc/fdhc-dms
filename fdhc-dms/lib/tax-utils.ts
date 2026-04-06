// ---------------------------------------------------------------------------
// State-specific tax and compliance utilities
// ---------------------------------------------------------------------------

import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StateCompliance {
  id: string
  state_code: string
  state_name: string
  sales_tax_rate: number
  /** Whether freight is subject to sales tax */
  tax_on_freight: boolean
  /** Whether setup/installation is subject to sales tax */
  tax_on_setup: boolean
  /** Whether factory-installed options are subject to sales tax */
  tax_on_options: boolean
  /** Whether site prep is subject to sales tax */
  tax_on_site_prep: boolean
  /** Number of calendar days for buyer cooling-off / right of rescission */
  cooling_off_days: number
  /** Maximum deposit as a percentage of total price (0-100) */
  max_deposit_percent: number
  /** Required disclosures (JSON array of disclosure objects) */
  required_disclosures: Disclosure[] | null
  /** Any additional state-specific notes */
  notes: string | null
}

export interface Disclosure {
  code: string
  title: string
  text: string
  /** Whether the disclosure must be signed separately */
  requires_signature: boolean
}

export interface TaxLineItems {
  homePrice: number
  freight: number
  setup: number
  options: number
  sitePrep: number
}

export interface SalesTaxResult {
  /** Sum of all taxable line items for the state */
  taxableAmount: number
  /** State sales tax rate (decimal, e.g. 0.065 for 6.5%) */
  taxRate: number
  /** Computed tax amount (taxableAmount * taxRate) */
  taxAmount: number
}

export interface DepositValidation {
  valid: boolean
  maxAllowed: number
}

// ---------------------------------------------------------------------------
// Tax calculation
// ---------------------------------------------------------------------------

/**
 * Calculate sales tax for a manufactured home sale based on state rules.
 *
 * Different states tax different line items (freight, setup, options, site
 * prep). This function uses the state compliance record to determine which
 * items are taxable, then applies the state rate.
 */
export function calcSalesTax(
  stateRequirements: StateCompliance,
  items: TaxLineItems,
): SalesTaxResult {
  const rate = stateRequirements.sales_tax_rate

  let taxableAmount = items.homePrice

  if (stateRequirements.tax_on_freight) {
    taxableAmount += items.freight
  }
  if (stateRequirements.tax_on_setup) {
    taxableAmount += items.setup
  }
  if (stateRequirements.tax_on_options) {
    taxableAmount += items.options
  }
  if (stateRequirements.tax_on_site_prep) {
    taxableAmount += items.sitePrep
  }

  const taxRate = rate / 100
  const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100

  return { taxableAmount, taxRate, taxAmount }
}

// ---------------------------------------------------------------------------
// State requirements lookup
// ---------------------------------------------------------------------------

/**
 * Fetch the compliance/tax requirements record for a given state.
 *
 * Queries `state_compliance_requirements` by two-letter state code.
 */
export async function getStateRequirements(
  supabase: SupabaseClient,
  stateCode: string,
): Promise<StateCompliance | null> {
  const { data, error } = await supabase
    .from('state_compliance_requirements')
    .select('*')
    .eq('state_code', stateCode.toUpperCase())
    .maybeSingle()

  if (error || !data) return null
  return data as StateCompliance
}

// ---------------------------------------------------------------------------
// Cooling-off / right of rescission
// ---------------------------------------------------------------------------

/**
 * Calculate the date by which the buyer may cancel (cooling-off period).
 *
 * @param agreementDate - The date the purchase agreement was signed.
 * @param coolingOffDays - Number of calendar days in the cooling-off window.
 * @returns The last day the buyer can exercise their right of rescission.
 */
export function getCoolingOffDate(
  agreementDate: Date,
  coolingOffDays: number,
): Date {
  const result = new Date(agreementDate)
  result.setDate(result.getDate() + coolingOffDays)
  return result
}

// ---------------------------------------------------------------------------
// Deposit validation
// ---------------------------------------------------------------------------

/**
 * Validate that a deposit amount does not exceed the state maximum.
 *
 * @param amount - Proposed deposit amount in dollars.
 * @param totalPrice - Total purchase price.
 * @param maxDepositPercent - Maximum deposit as % of total (from state rules).
 */
export function validateDeposit(
  amount: number,
  totalPrice: number,
  maxDepositPercent: number,
): DepositValidation {
  const maxAllowed = Math.round(totalPrice * (maxDepositPercent / 100) * 100) / 100
  return {
    valid: amount <= maxAllowed,
    maxAllowed,
  }
}
