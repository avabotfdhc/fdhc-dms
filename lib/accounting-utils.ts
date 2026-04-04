import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Update an account balance by a given amount.
 * Positive = increase, negative = decrease.
 */
export async function updateAccountBalance(
  supabase: SupabaseClient,
  accountCode: string,
  amount: number
) {
  // Fetch current balance
  const { data: account, error: fetchError } = await supabase
    .from('accounts')
    .select('id, balance')
    .eq('code', accountCode)
    .single()

  if (fetchError || !account) {
    console.error(`Account ${accountCode} not found:`, fetchError)
    return null
  }

  const newBalance = (account.balance || 0) + amount

  const { error: updateError } = await supabase
    .from('accounts')
    .update({ balance: newBalance })
    .eq('id', account.id)

  if (updateError) {
    console.error(`Failed to update account ${accountCode}:`, updateError)
    return null
  }

  return { id: account.id, code: accountCode, balance: newBalance }
}

/**
 * Standard ledger entry types for a deal closing.
 */
const DEAL_ENTRY_TYPES = [
  'SALE_REVENUE',
  'COGS_HOME',
  'COGS_FREIGHT',
  'COGS_SETUP',
  'PACK_EARNED',
  'COMMISSION',
  'TAX_COLLECTED',
] as const

type DealEntryType = (typeof DEAL_ENTRY_TYPES)[number]

interface DealFinancials {
  sale_price: number
  invoice_price: number
  freight_cost: number
  setup_cost: number
  dealer_pack: number
  commission: number
  tax_amount: number
}

/** Account code mappings for deal entries */
const ACCOUNT_CODES: Record<DealEntryType, { debit: string; credit: string }> = {
  SALE_REVENUE:   { debit: '1100', credit: '4000' },  // AR -> Sales Revenue
  COGS_HOME:      { debit: '5000', credit: '1200' },  // COGS Home -> Inventory
  COGS_FREIGHT:   { debit: '5010', credit: '2000' },  // COGS Freight -> AP
  COGS_SETUP:     { debit: '5020', credit: '2000' },  // COGS Setup -> AP
  PACK_EARNED:    { debit: '5030', credit: '4010' },  // Pack Expense -> Pack Revenue
  COMMISSION:     { debit: '6000', credit: '2010' },  // Commission Exp -> Commission Payable
  TAX_COLLECTED:  { debit: '1100', credit: '2100' },  // AR -> Tax Payable
}

/**
 * Create ledger entries when a deal closes.
 * Reads deal financials, creates ledger_entries rows,
 * and optionally creates a journal entry with matching debit/credit lines.
 */
export async function createDealLedgerEntries(
  supabase: SupabaseClient,
  dealId: string
) {
  // Fetch deal and related data
  const { data: deal, error: dealError } = await supabase
    .from('agreements')
    .select('*, inventory(invoice_price, freight_cost, factory_direct_price)')
    .eq('id', dealId)
    .single()

  if (dealError || !deal) {
    console.error('Deal not found:', dealError)
    return { success: false, error: 'Deal not found' }
  }

  const inventory = deal.inventory as Record<string, number> | null

  const financials: DealFinancials = {
    sale_price: deal.sale_price || 0,
    invoice_price: inventory?.invoice_price || inventory?.factory_direct_price || 0,
    freight_cost: inventory?.freight_cost || deal.freight_cost || 0,
    setup_cost: deal.setup_cost || 0,
    dealer_pack: deal.dealer_pack || 0,
    commission: deal.commission || 0,
    tax_amount: deal.tax_amount || 0,
  }

  const amounts: Record<DealEntryType, number> = {
    SALE_REVENUE: financials.sale_price,
    COGS_HOME: financials.invoice_price,
    COGS_FREIGHT: financials.freight_cost,
    COGS_SETUP: financials.setup_cost,
    PACK_EARNED: financials.dealer_pack,
    COMMISSION: financials.commission,
    TAX_COLLECTED: financials.tax_amount,
  }

  // Create ledger entries
  const entries = DEAL_ENTRY_TYPES
    .filter(type => amounts[type] > 0)
    .map(type => ({
      deal_id: dealId,
      entry_type: type,
      amount: amounts[type],
      description: `${type} for deal ${dealId}`,
      created_at: new Date().toISOString(),
    }))

  if (entries.length === 0) {
    return { success: true, entries: [], journalEntry: null }
  }

  const { error: ledgerError } = await supabase
    .from('ledger_entries')
    .insert(entries)

  if (ledgerError) {
    console.error('Failed to create ledger entries:', ledgerError)
    return { success: false, error: ledgerError.message }
  }

  // Create journal entry with debit/credit lines
  const { data: journalEntry, error: jeError } = await supabase
    .from('journal_entries')
    .insert({
      reference: `DEAL-${dealId.slice(0, 8).toUpperCase()}`,
      description: `Auto-generated entries for deal close`,
      date: new Date().toISOString().split('T')[0],
      posted: true,
    })
    .select('id')
    .single()

  if (jeError || !journalEntry) {
    console.error('Failed to create journal entry:', jeError)
    return { success: true, entries, journalEntry: null }
  }

  // Build journal lines
  const journalLines: Array<{
    journal_entry_id: string
    account_code: string
    debit: number
    credit: number
    memo: string
  }> = []

  for (const type of DEAL_ENTRY_TYPES) {
    const amount = amounts[type]
    if (amount <= 0) continue
    const codes = ACCOUNT_CODES[type]

    journalLines.push({
      journal_entry_id: journalEntry.id,
      account_code: codes.debit,
      debit: amount,
      credit: 0,
      memo: type,
    })
    journalLines.push({
      journal_entry_id: journalEntry.id,
      account_code: codes.credit,
      debit: 0,
      credit: amount,
      memo: type,
    })
  }

  if (journalLines.length > 0) {
    // Look up account IDs by code
    const uniqueCodes = [...new Set(journalLines.map(l => l.account_code))]
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, code')
      .in('code', uniqueCodes)

    const codeToId = new Map((accounts || []).map(a => [a.code, a.id]))

    const linesToInsert = journalLines
      .map(l => ({
        journal_entry_id: l.journal_entry_id,
        account_id: codeToId.get(l.account_code) || null,
        debit: l.debit,
        credit: l.credit,
        memo: l.memo,
      }))
      .filter(l => l.account_id)

    if (linesToInsert.length > 0) {
      await supabase.from('journal_lines').insert(linesToInsert)
    }

    // Update account balances
    for (const line of journalLines) {
      const net = line.debit - line.credit
      if (net !== 0) {
        await updateAccountBalance(supabase, line.account_code, net)
      }
    }
  }

  return { success: true, entries, journalEntry }
}
