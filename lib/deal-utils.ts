// ---------------------------------------------------------------------------
// Deal / financing calculation utilities
// ---------------------------------------------------------------------------

/**
 * Calculate monthly payment using standard amortization formula.
 *
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 *
 * Returns 0 when principal or term is zero.  Handles zero-interest (simple
 * division) gracefully.
 */
export function calcMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number,
): number {
  if (principal <= 0 || termMonths <= 0) return 0

  const monthlyRate = annualRate / 100 / 12

  if (monthlyRate === 0) {
    return principal / termMonths
  }

  const factor = Math.pow(1 + monthlyRate, termMonths)
  return (principal * monthlyRate * factor) / (factor - 1)
}

/**
 * Sum all cost components into a single total.
 */
export function calcTotalCost(
  basePrice: number,
  options: number,
  freight: number,
  setup: number,
  sitePrep: number,
): number {
  return basePrice + options + freight + setup + sitePrep
}

/**
 * Amount financed = total cost minus money already applied (down payment +
 * trade-in). Never negative.
 */
export function calcAmountFinanced(
  totalCost: number,
  downPayment: number,
  tradeIn: number,
): number {
  return Math.max(0, totalCost - downPayment - tradeIn)
}

/**
 * Total interest paid over the life of the loan.
 */
export function calcTotalInterest(
  monthlyPayment: number,
  termMonths: number,
  amountFinanced: number,
): number {
  return Math.max(0, monthlyPayment * termMonths - amountFinanced)
}

// ---------------------------------------------------------------------------
// Preset financing scenarios
// ---------------------------------------------------------------------------

export interface FinancingScenario {
  name: string
  /** Down payment as a percentage of total cost (0-100) */
  downPaymentPercent: number
  /** Loan term in years */
  termYears: number
  /** Annual interest rate (percent) */
  annualRate: number
}

/**
 * Three standard scenarios used across the desking matrix and deal sheets.
 */
export const DEFAULT_SCENARIOS: FinancingScenario[] = [
  {
    name: 'Chattel Min Down',
    downPaymentPercent: 5,
    termYears: 20,
    annualRate: 8.99,
  },
  {
    name: 'Chattel Standard',
    downPaymentPercent: 10,
    termYears: 20,
    annualRate: 8.49,
  },
  {
    name: 'Land-Home FHA',
    downPaymentPercent: 20,
    termYears: 30,
    annualRate: 6.75,
  },
]

// ---------------------------------------------------------------------------
// Convenience: run a full scenario calculation
// ---------------------------------------------------------------------------

export interface ScenarioResult {
  scenario: FinancingScenario
  downPayment: number
  termMonths: number
  amountFinanced: number
  monthlyPayment: number
  totalInterest: number
  totalCost: number
}

/**
 * Run a financing scenario against a given total cost and optional trade-in.
 */
export function runScenario(
  scenario: FinancingScenario,
  totalCost: number,
  tradeIn: number = 0,
): ScenarioResult {
  const downPayment = totalCost * (scenario.downPaymentPercent / 100)
  const termMonths = scenario.termYears * 12
  const amountFinanced = calcAmountFinanced(totalCost, downPayment, tradeIn)
  const monthlyPayment = calcMonthlyPayment(
    amountFinanced,
    scenario.annualRate,
    termMonths,
  )
  const totalInterest = calcTotalInterest(
    monthlyPayment,
    termMonths,
    amountFinanced,
  )

  return {
    scenario,
    downPayment,
    termMonths,
    amountFinanced,
    monthlyPayment,
    totalInterest,
    totalCost,
  }
}
