'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getStateRequirements, getCoolingOffDate, type StateCompliance } from '@/lib/tax-utils'
import { getRequiredDisclosures } from '@/lib/agreement-utils'
import type { Disclosure } from '@/lib/tax-utils'
import PrintPreview from '@/components/PrintPreview'

interface AgreementRow {
  id: string
  deal_id: string
  agreement_number: string
  status: string
  buyer_info: Record<string, string>
  home_description: Record<string, string>
  financial_terms: Record<string, number>
  delivery_address: string | null
  special_terms: string | null
  state_code: string | null
  disclosures: Record<string, boolean> | null
  client_signed_at: string | null
  sales_rep_signed_at: string | null
  manager_signed_at: string | null
  created_at: string
}

interface UpgradeRow {
  item_number: string
  description: string
  category: string
  retail_price: number
  installation_cost: number
}

interface DealerSettings {
  dealership_name?: string
  address?: string
  phone?: string
}

export default function PrintPage() {
  const params = useParams()
  const router = useRouter()
  const dealId = params.id as string
  const supabase = createClient()

  const [agreement, setAgreement] = useState<AgreementRow | null>(null)
  const [upgrades, setUpgrades] = useState<UpgradeRow[]>([])
  const [stateReq, setStateReq] = useState<StateCompliance | null>(null)
  const [disclosuresList, setDisclosuresList] = useState<Disclosure[]>([])
  const [settings, setSettings] = useState<DealerSettings>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Fetch agreement
      const { data: agr } = await supabase
        .from('purchase_agreements')
        .select('*')
        .eq('deal_id', dealId)
        .maybeSingle()

      if (!agr) { setLoading(false); return }
      setAgreement(agr as AgreementRow)

      // Fetch upgrades
      const { data: ups } = await supabase
        .from('addendum_a_upgrades')
        .select('item_number, description, category, retail_price, installation_cost')
        .eq('agreement_id', agr.id)
        .order('item_number', { ascending: true })
      setUpgrades((ups as UpgradeRow[]) || [])

      // Fetch state compliance
      if (agr.state_code) {
        const sr = await getStateRequirements(supabase, agr.state_code)
        setStateReq(sr)
        setDisclosuresList(getRequiredDisclosures(agr.state_code, sr))
      }

      // Fetch dealership settings
      const { data: settingsRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'dealership')
        .maybeSingle()
      if (settingsRow?.value) {
        setSettings(settingsRow.value as DealerSettings)
      }

      setLoading(false)
    }
    load()
  }, [dealId, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!agreement) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">No purchase agreement found for this deal.</p>
      </div>
    )
  }

  const buyer = agreement.buyer_info || {}
  const model = agreement.home_description || {}
  const fin = agreement.financial_terms || {}
  const totalCost = fin.total_cost || 0
  const amountFinanced = fin.amount_financed || 0
  const upgradeTotal = upgrades.reduce((s, u) => s + (u.retail_price || 0) + (u.installation_cost || 0), 0)
  const savedDisclosures = agreement.disclosures || {}
  const coolingOffDate = stateReq ? getCoolingOffDate(new Date(agreement.created_at), stateReq.cooling_off_days) : null

  const dateFormatted = new Date(agreement.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <PrintPreview onBack={() => router.push(`/agreements/${dealId}/contract`)}>
      {/* Print styles injected inline */}
      <style>{`
        @media print {
          nav, .print\\:hidden { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-page { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
          .page-break { page-break-before: always; }
          @page { margin: 0.75in; }
        }
      `}</style>

      <div className="print-page mx-auto max-w-3xl bg-white p-6 md:p-10 print:p-0">
        {/* Letterhead */}
        <header className="border-b-2 border-slate-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            {settings.dealership_name || 'Factory Direct Homes Center'}
          </h1>
          {settings.address && <p className="text-sm text-slate-600 mt-0.5">{settings.address}</p>}
          {settings.phone && <p className="text-sm text-slate-600">{settings.phone}</p>}
        </header>

        {/* Title + Agreement Number */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">Purchase Agreement</h2>
          <p className="text-sm text-slate-600 mt-1">
            Agreement #{agreement.agreement_number} &mdash; {dateFormatted}
          </p>
        </div>

        {/* Buyer Information */}
        <section className="mb-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Buyer Information</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-slate-500">Name:</span>{' '}
              <span className="font-medium text-slate-900">{buyer.name || '---'}</span>
            </div>
            <div>
              <span className="text-slate-500">Email:</span>{' '}
              <span className="font-medium text-slate-900">{buyer.email || '---'}</span>
            </div>
            <div>
              <span className="text-slate-500">Phone:</span>{' '}
              <span className="font-medium text-slate-900">{buyer.phone || '---'}</span>
            </div>
            <div>
              <span className="text-slate-500">Address:</span>{' '}
              <span className="font-medium text-slate-900">{buyer.address || '---'}</span>
            </div>
            {buyer.co_buyer_name && (
              <div className="col-span-2">
                <span className="text-slate-500">Co-Buyer:</span>{' '}
                <span className="font-medium text-slate-900">{buyer.co_buyer_name}</span>
              </div>
            )}
          </div>
        </section>

        {/* Home Description */}
        <section className="mb-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Home Description</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ['Manufacturer', model.manufacturer],
              ['Model', model.model_name],
              ['Model #', model.model_number],
              ['Serial #', model.serial_number],
              ['Year', model.year],
              ['Bedrooms', model.bedrooms],
              ['Bathrooms', model.bathrooms],
              ['Sq Ft', model.square_feet],
              ['Width', model.width ? `${model.width} ft` : null],
              ['Length', model.length ? `${model.length} ft` : null],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label as string}>
                <span className="text-slate-500">{label}:</span>{' '}
                <span className="font-medium text-slate-900">{val}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Financial Breakdown */}
        <section className="mb-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Financial Breakdown</h3>
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Sale Price', fin.sale_price],
                ['Factory Options', fin.options],
                ['Freight', fin.freight],
                ['Setup / Installation', fin.setup],
                ['Site Preparation', fin.site_prep],
              ].map(([label, val]) => (
                <tr key={label as string} className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-600">{label}</td>
                  <td className="py-1.5 text-right font-medium text-slate-900">
                    ${((val as number) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              <tr className="border-b-2 border-slate-300">
                <td className="py-2 font-bold text-slate-900">Total Cost</td>
                <td className="py-2 text-right font-bold text-slate-900">
                  ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600">Down Payment</td>
                <td className="py-1.5 text-right font-medium text-slate-900">
                  -${(fin.down_payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600">Trade-In Value</td>
                <td className="py-1.5 text-right font-medium text-slate-900">
                  -${(fin.trade_in || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="border-b-2 border-slate-800">
                <td className="py-2 font-bold text-slate-900">Amount Financed</td>
                <td className="py-2 text-right font-bold text-slate-900">
                  ${amountFinanced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              {fin.interest_rate > 0 && (
                <>
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 text-slate-600">Interest Rate</td>
                    <td className="py-1.5 text-right font-medium text-slate-900">{fin.interest_rate}%</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 text-slate-600">Term</td>
                    <td className="py-1.5 text-right font-medium text-slate-900">{fin.term_months} months</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 text-slate-600">Monthly Payment</td>
                    <td className="py-1.5 text-right font-medium text-slate-900">
                      ${(fin.monthly_payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </section>

        {/* Delivery Address */}
        {agreement.delivery_address && (
          <section className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Delivery / Site Address</h3>
            <p className="text-sm text-slate-800">{agreement.delivery_address}</p>
          </section>
        )}

        {/* Addendum A Upgrades */}
        {upgrades.length > 0 && (
          <section className="mb-6 page-break">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Addendum A &mdash; Upgrades &amp; Options</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-1.5 font-medium text-slate-600 w-16">Item</th>
                  <th className="py-1.5 font-medium text-slate-600">Description</th>
                  <th className="py-1.5 font-medium text-slate-600 text-right">Price</th>
                  <th className="py-1.5 font-medium text-slate-600 text-right">Install</th>
                </tr>
              </thead>
              <tbody>
                {upgrades.map(u => (
                  <tr key={u.item_number} className="border-b border-slate-100">
                    <td className="py-1.5 font-mono text-xs text-slate-500">{u.item_number}</td>
                    <td className="py-1.5 text-slate-800">{u.description}</td>
                    <td className="py-1.5 text-right text-slate-900">
                      ${(u.retail_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1.5 text-right text-slate-900">
                      ${(u.installation_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300">
                  <td colSpan={2} className="py-2 font-bold text-slate-900">Addendum Total</td>
                  <td colSpan={2} className="py-2 text-right font-bold text-slate-900">
                    ${upgradeTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Special Terms */}
        {agreement.special_terms && (
          <section className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Special Terms &amp; Conditions</h3>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{agreement.special_terms}</p>
          </section>
        )}

        {/* Required Disclosures */}
        {(disclosuresList.length > 0 || coolingOffDate) && (
          <section className="mb-6 page-break">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Required Disclosures</h3>

            {/* Formaldehyde — always */}
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-700 uppercase">Formaldehyde Disclosure</p>
              <p className="text-xs text-slate-600 mt-0.5">
                This manufactured home may contain formaldehyde-based resins. Formaldehyde levels in indoor air can cause health problems.
              </p>
            </div>

            {/* HUD Standards */}
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-700 uppercase">HUD Installation Standards (24 CFR 3285)</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Installation must comply with federal and state manufactured home installation standards.
                {stateReq && ` State: ${stateReq.state_name} (${stateReq.state_code})`}
              </p>
            </div>

            {/* Cooling off */}
            {stateReq && coolingOffDate && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-700 uppercase">Right of Rescission / Cooling-Off Period</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  The buyer has {stateReq.cooling_off_days} calendar days from execution to cancel this agreement.
                  Cancellation deadline: {coolingOffDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
                </p>
              </div>
            )}

            {/* State-specific */}
            {disclosuresList.map(d => {
              const isIncluded = savedDisclosures[d.code]
              return (
                <div key={d.code} className="mb-3">
                  <p className="text-xs font-semibold text-slate-700 uppercase">
                    {d.title}
                    {!isIncluded && <span className="ml-2 text-red-500">[Not Included]</span>}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{d.text}</p>
                </div>
              )
            })}
          </section>
        )}

        {/* Signature Blocks */}
        <section className="mt-12">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1 mb-6">Signatures</h3>
          <div className="space-y-10">
            {/* Buyer */}
            <div>
              <div className="flex items-end justify-between">
                <div className="flex-1 border-b border-slate-400 mr-4 pb-1">
                  <p className="text-[10px] text-slate-400 uppercase">Buyer Signature</p>
                </div>
                <div className="w-40 border-b border-slate-400 pb-1">
                  <p className="text-[10px] text-slate-400 uppercase">Date</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-1">{buyer.name || 'Buyer Name'}</p>
            </div>

            {/* Co-Buyer */}
            {buyer.co_buyer_name && (
              <div>
                <div className="flex items-end justify-between">
                  <div className="flex-1 border-b border-slate-400 mr-4 pb-1">
                    <p className="text-[10px] text-slate-400 uppercase">Co-Buyer Signature</p>
                  </div>
                  <div className="w-40 border-b border-slate-400 pb-1">
                    <p className="text-[10px] text-slate-400 uppercase">Date</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-1">{buyer.co_buyer_name}</p>
              </div>
            )}

            {/* Sales Rep */}
            <div>
              <div className="flex items-end justify-between">
                <div className="flex-1 border-b border-slate-400 mr-4 pb-1">
                  <p className="text-[10px] text-slate-400 uppercase">Sales Representative Signature</p>
                </div>
                <div className="w-40 border-b border-slate-400 pb-1">
                  <p className="text-[10px] text-slate-400 uppercase">Date</p>
                </div>
              </div>
            </div>

            {/* Manager */}
            <div>
              <div className="flex items-end justify-between">
                <div className="flex-1 border-b border-slate-400 mr-4 pb-1">
                  <p className="text-[10px] text-slate-400 uppercase">Sales Manager Signature</p>
                </div>
                <div className="w-40 border-b border-slate-400 pb-1">
                  <p className="text-[10px] text-slate-400 uppercase">Date</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Page number — print only */}
        <footer className="mt-12 text-center text-[10px] text-slate-400 print:block hidden">
          <p>Agreement #{agreement.agreement_number} &mdash; Page 1</p>
        </footer>
      </div>
    </PrintPreview>
  )
}
