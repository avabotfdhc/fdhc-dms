'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { autoPopulateAgreement, generateAgreementNumber } from '@/lib/agreement-utils'
import { getStateRequirements, type StateCompliance } from '@/lib/tax-utils'
import type { PurchaseAgreementData } from '@/lib/agreement-utils'
import FormField from '@/components/ui/FormField'
import CurrencyInput from '@/components/ui/CurrencyInput'
import SaveIndicator from '@/components/ui/SaveIndicator'
import LegalDisclosuresForm from '@/components/LegalDisclosuresForm'
import SignatureWorkflow from '@/components/SignatureWorkflow'
import DepositTracker from '@/components/DepositTracker'

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
]

interface FormData {
  buyerName: string
  buyerEmail: string
  buyerPhone: string
  buyerAddress: string
  coBuyerName: string
  coBuyerAddress: string
  manufacturer: string
  modelName: string
  modelNumber: string
  serialNumber: string
  year: string
  bedrooms: string
  bathrooms: string
  squareFeet: string
  width: string
  length: string
  salePrice: number
  options: number
  freight: number
  setup: number
  sitePrep: number
  downPayment: number
  tradeIn: number
  interestRate: number
  termMonths: number
  monthlyPayment: number
  deliveryAddress: string
  specialTerms: string
  stateCode: string
}

function initialFormData(): FormData {
  return {
    buyerName: '', buyerEmail: '', buyerPhone: '', buyerAddress: '',
    coBuyerName: '', coBuyerAddress: '',
    manufacturer: '', modelName: '', modelNumber: '', serialNumber: '',
    year: '', bedrooms: '', bathrooms: '', squareFeet: '', width: '', length: '',
    salePrice: 0, options: 0, freight: 0, setup: 0, sitePrep: 0,
    downPayment: 0, tradeIn: 0, interestRate: 0, termMonths: 0, monthlyPayment: 0,
    deliveryAddress: '', specialTerms: '', stateCode: '',
  }
}

function populateFromAgreementData(data: PurchaseAgreementData): FormData {
  return {
    buyerName: data.buyer.name,
    buyerEmail: data.buyer.email || '',
    buyerPhone: data.buyer.phone || '',
    buyerAddress: data.buyer.address || '',
    coBuyerName: data.coBuyer?.name || '',
    coBuyerAddress: data.coBuyer?.address || '',
    manufacturer: data.model.manufacturer || '',
    modelName: data.model.modelName || '',
    modelNumber: data.model.modelNumber || '',
    serialNumber: data.model.serialNumber || '',
    year: data.model.year || '',
    bedrooms: data.model.bedrooms || '',
    bathrooms: data.model.bathrooms || '',
    squareFeet: data.model.squareFeet || '',
    width: data.model.width || '',
    length: data.model.length || '',
    salePrice: data.financials.salePrice,
    options: data.financials.options,
    freight: data.financials.freight,
    setup: data.financials.setup,
    sitePrep: data.financials.sitePrep,
    downPayment: data.financials.downPayment,
    tradeIn: data.financials.tradeIn,
    interestRate: data.financials.interestRate,
    termMonths: data.financials.termMonths,
    monthlyPayment: data.financials.monthlyPayment,
    deliveryAddress: data.deliveryAddress || '',
    specialTerms: '',
    stateCode: '',
  }
}

export default function ContractPage() {
  const params = useParams()
  const router = useRouter()
  const dealId = params.id as string
  const supabase = createClient()

  const [form, setForm] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const [agreementNumber, setAgreementNumber] = useState<string | null>(null)
  const [agreementId, setAgreementId] = useState<string | null>(null)
  const [stateCompliance, setStateCompliance] = useState<StateCompliance | null>(null)
  const [agreement, setAgreement] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load deal data and auto-populate
  useEffect(() => {
    async function load() {
      try {
        // Check if a purchase agreement already exists for this deal
        const { data: existing } = await supabase
          .from('purchase_agreements')
          .select('*')
          .eq('deal_id', dealId)
          .maybeSingle()

        if (existing) {
          setAgreementId(existing.id)
          setAgreementNumber(existing.agreement_number)
          setAgreement(existing)
          const buyer = (existing.buyer_info as Record<string, string>) || {}
          const model = (existing.home_description as Record<string, string>) || {}
          const fin = (existing.financial_terms as Record<string, number>) || {}
          setForm({
            buyerName: buyer.name || '',
            buyerEmail: buyer.email || '',
            buyerPhone: buyer.phone || '',
            buyerAddress: buyer.address || '',
            coBuyerName: buyer.co_buyer_name || '',
            coBuyerAddress: buyer.co_buyer_address || '',
            manufacturer: model.manufacturer || '',
            modelName: model.model_name || '',
            modelNumber: model.model_number || '',
            serialNumber: model.serial_number || '',
            year: model.year || '',
            bedrooms: model.bedrooms || '',
            bathrooms: model.bathrooms || '',
            squareFeet: model.square_feet || '',
            width: model.width || '',
            length: model.length || '',
            salePrice: fin.sale_price || 0,
            options: fin.options || 0,
            freight: fin.freight || 0,
            setup: fin.setup || 0,
            sitePrep: fin.site_prep || 0,
            downPayment: fin.down_payment || 0,
            tradeIn: fin.trade_in || 0,
            interestRate: fin.interest_rate || 0,
            termMonths: fin.term_months || 0,
            monthlyPayment: fin.monthly_payment || 0,
            deliveryAddress: existing.delivery_address || '',
            specialTerms: existing.special_terms || '',
            stateCode: existing.state_code || '',
          })
          if (existing.state_code) {
            const sr = await getStateRequirements(supabase, existing.state_code)
            setStateCompliance(sr)
          }
        } else {
          // Auto-populate from deal data
          const data = await autoPopulateAgreement(supabase, dealId)
          setForm(populateFromAgreementData(data))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deal data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dealId])

  // Auto-save draft
  const autoSave = useCallback(async (data: FormData) => {
    if (!agreementId) return
    setSaveStatus('saving')
    try {
      const { error: err } = await supabase
        .from('purchase_agreements')
        .update({
          buyer_info: {
            name: data.buyerName, email: data.buyerEmail,
            phone: data.buyerPhone, address: data.buyerAddress,
            co_buyer_name: data.coBuyerName, co_buyer_address: data.coBuyerAddress,
          },
          home_description: {
            manufacturer: data.manufacturer, model_name: data.modelName,
            model_number: data.modelNumber, serial_number: data.serialNumber,
            year: data.year, bedrooms: data.bedrooms, bathrooms: data.bathrooms,
            square_feet: data.squareFeet, width: data.width, length: data.length,
          },
          financial_terms: {
            sale_price: data.salePrice, options: data.options, freight: data.freight,
            setup: data.setup, site_prep: data.sitePrep, down_payment: data.downPayment,
            trade_in: data.tradeIn, interest_rate: data.interestRate,
            term_months: data.termMonths, monthly_payment: data.monthlyPayment,
            total_cost: data.salePrice + data.options + data.freight + data.setup + data.sitePrep,
            amount_financed: Math.max(0, data.salePrice + data.options + data.freight + data.setup + data.sitePrep - data.downPayment - data.tradeIn),
          },
          delivery_address: data.deliveryAddress,
          special_terms: data.specialTerms,
          state_code: data.stateCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agreementId)

      setSaveStatus(err ? 'error' : 'saved')
    } catch {
      setSaveStatus('error')
    }
  }, [agreementId, supabase])

  function updateField(field: keyof FormData, value: string | number) {
    const next = { ...form, [field]: value }
    setForm(next)
    setSaveStatus('unsaved')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => autoSave(next), 1500)
  }

  function handleTextChange(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      updateField(field, e.target.value)
    }
  }

  function handleCurrencyChange(field: keyof FormData) {
    return (val: number) => updateField(field, val)
  }

  // State selector handler
  async function handleStateChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const code = e.target.value
    updateField('stateCode', code)
    if (code) {
      const sr = await getStateRequirements(supabase, code)
      setStateCompliance(sr)
    } else {
      setStateCompliance(null)
    }
  }

  // Generate agreement
  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const number = generateAgreementNumber()
      const totalCost = form.salePrice + form.options + form.freight + form.setup + form.sitePrep
      const amountFinanced = Math.max(0, totalCost - form.downPayment - form.tradeIn)

      const { data: row, error: insertErr } = await supabase
        .from('purchase_agreements')
        .insert({
          deal_id: dealId,
          agreement_number: number,
          status: 'draft',
          buyer_info: {
            name: form.buyerName, email: form.buyerEmail,
            phone: form.buyerPhone, address: form.buyerAddress,
            co_buyer_name: form.coBuyerName, co_buyer_address: form.coBuyerAddress,
          },
          home_description: {
            manufacturer: form.manufacturer, model_name: form.modelName,
            model_number: form.modelNumber, serial_number: form.serialNumber,
            year: form.year, bedrooms: form.bedrooms, bathrooms: form.bathrooms,
            square_feet: form.squareFeet, width: form.width, length: form.length,
          },
          financial_terms: {
            sale_price: form.salePrice, options: form.options, freight: form.freight,
            setup: form.setup, site_prep: form.sitePrep, down_payment: form.downPayment,
            trade_in: form.tradeIn, interest_rate: form.interestRate,
            term_months: form.termMonths, monthly_payment: form.monthlyPayment,
            total_cost: totalCost, amount_financed: amountFinanced,
          },
          delivery_address: form.deliveryAddress,
          special_terms: form.specialTerms,
          state_code: form.stateCode,
          disclosures: {},
          client_signed_at: null,
          sales_rep_signed_at: null,
          manager_signed_at: null,
          deposit_amount: 0,
          deposit_status: 'unpaid',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertErr) throw new Error(insertErr.message)
      setAgreementNumber(number)
      setAgreementId(row.id)
      setAgreement(row)
      setSaveStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate agreement')
    } finally {
      setGenerating(false)
    }
  }

  // Computed totals
  const totalCost = form.salePrice + form.options + form.freight + form.setup + form.sitePrep
  const amountFinanced = Math.max(0, totalCost - form.downPayment - form.tradeIn)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/agreements/${dealId}`} className="text-slate-400 hover:text-slate-600 text-sm">
          ← Deal
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium">Purchase Agreement</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Purchase Agreement</h1>
          {agreementNumber && (
            <p className="text-sm text-slate-500 mt-0.5">Agreement #{agreementNumber}</p>
          )}
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Client Info Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-4">Client Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Buyer Name" name="buyerName" value={form.buyerName} onChange={handleTextChange('buyerName')} required />
          <FormField label="Email" name="buyerEmail" type="email" value={form.buyerEmail} onChange={handleTextChange('buyerEmail')} />
          <FormField label="Phone" name="buyerPhone" type="tel" value={form.buyerPhone} onChange={handleTextChange('buyerPhone')} />
          <FormField label="Address" name="buyerAddress" value={form.buyerAddress} onChange={handleTextChange('buyerAddress')} />
          <FormField label="Co-Buyer Name" name="coBuyerName" value={form.coBuyerName} onChange={handleTextChange('coBuyerName')} />
          <FormField label="Co-Buyer Address" name="coBuyerAddress" value={form.coBuyerAddress} onChange={handleTextChange('coBuyerAddress')} />
        </div>
      </section>

      {/* Home Description Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-4">Home Description</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleTextChange('manufacturer')} />
          <FormField label="Model Name" name="modelName" value={form.modelName} onChange={handleTextChange('modelName')} />
          <FormField label="Model Number" name="modelNumber" value={form.modelNumber} onChange={handleTextChange('modelNumber')} />
          <FormField label="Serial Number" name="serialNumber" value={form.serialNumber} onChange={handleTextChange('serialNumber')} />
          <FormField label="Year" name="year" value={form.year} onChange={handleTextChange('year')} />
          <FormField label="Bedrooms" name="bedrooms" value={form.bedrooms} onChange={handleTextChange('bedrooms')} />
          <FormField label="Bathrooms" name="bathrooms" value={form.bathrooms} onChange={handleTextChange('bathrooms')} />
          <FormField label="Square Feet" name="squareFeet" value={form.squareFeet} onChange={handleTextChange('squareFeet')} />
          <FormField label="Width (ft)" name="width" value={form.width} onChange={handleTextChange('width')} />
          <FormField label="Length (ft)" name="length" value={form.length} onChange={handleTextChange('length')} />
        </div>
      </section>

      {/* Financial Terms Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-4">Financial Terms</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CurrencyInput label="Sale Price" name="salePrice" value={form.salePrice} onChange={handleCurrencyChange('salePrice')} />
          <CurrencyInput label="Options" name="options" value={form.options} onChange={handleCurrencyChange('options')} />
          <CurrencyInput label="Freight" name="freight" value={form.freight} onChange={handleCurrencyChange('freight')} />
          <CurrencyInput label="Setup" name="setup" value={form.setup} onChange={handleCurrencyChange('setup')} />
          <CurrencyInput label="Site Prep" name="sitePrep" value={form.sitePrep} onChange={handleCurrencyChange('sitePrep')} />
          <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total Cost</span>
              <span className="font-semibold text-slate-900">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <CurrencyInput label="Down Payment" name="downPayment" value={form.downPayment} onChange={handleCurrencyChange('downPayment')} />
          <CurrencyInput label="Trade-In Value" name="tradeIn" value={form.tradeIn} onChange={handleCurrencyChange('tradeIn')} />
          <div className="sm:col-span-2 rounded-lg bg-blue-50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Amount Financed</span>
              <span className="font-semibold text-blue-900">${amountFinanced.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <FormField label="Interest Rate (%)" name="interestRate" type="number" value={form.interestRate} onChange={handleTextChange('interestRate')} />
          <FormField label="Term (months)" name="termMonths" type="number" value={form.termMonths} onChange={handleTextChange('termMonths')} />
          <CurrencyInput label="Monthly Payment" name="monthlyPayment" value={form.monthlyPayment} onChange={handleCurrencyChange('monthlyPayment')} />
        </div>
      </section>

      {/* Delivery Address */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-4">Site / Delivery Address</h2>
        <FormField label="Delivery Address" name="deliveryAddress" value={form.deliveryAddress} onChange={handleTextChange('deliveryAddress')} placeholder="Full delivery site address" />
      </section>

      {/* Special Terms */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-4">Special Terms</h2>
        <FormField label="Special Terms & Conditions" name="specialTerms" type="textarea" value={form.specialTerms} onChange={handleTextChange('specialTerms')} placeholder="Any additional terms, conditions, or notes..." />
      </section>

      {/* State Selector + Compliance */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-4">State Compliance</h2>
        <FormField
          label="State"
          name="stateCode"
          type="select"
          value={form.stateCode}
          onChange={handleStateChange}
          options={US_STATES}
          placeholder="Select state..."
        />
        {stateCompliance && agreementId && (
          <div className="mt-4">
            <LegalDisclosuresForm stateCode={form.stateCode} agreementId={agreementId} />
          </div>
        )}
      </section>

      {/* Generate or show existing agreement links */}
      {!agreementId ? (
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={generating || !form.buyerName}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : 'Generate Agreement'}
          </button>
        </div>
      ) : (
        <>
          {/* Links */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Link
              href={`/agreements/${dealId}/print`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Preview
            </Link>
            <Link
              href={`/agreements/${dealId}/contract#addendum`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Addendum A
            </Link>
          </div>

          {/* Addendum A Section */}
          <section id="addendum" className="mb-4">
            <AddendumASection agreementId={agreementId} />
          </section>

          {/* Signature Workflow */}
          {agreement && (
            <section className="mb-4">
              <SignatureWorkflow agreement={agreement as Record<string, unknown>} />
            </section>
          )}

          {/* Deposit Tracker */}
          {agreement && (
            <section className="mb-4">
              <DepositTracker agreement={agreement as Record<string, unknown>} />
            </section>
          )}
        </>
      )}
    </div>
  )
}

// Inline wrapper to avoid dynamic import issues — lazy loads the component
function AddendumASection({ agreementId }: { agreementId: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  // Use inline import to avoid SSR issues
  return <AddendumAInner agreementId={agreementId} />
}

function AddendumAInner({ agreementId }: { agreementId: string }) {
  // Dynamically require the component
  const AddendumAForm = require('@/components/AddendumAForm').default
  return <AddendumAForm agreementId={agreementId} />
}
