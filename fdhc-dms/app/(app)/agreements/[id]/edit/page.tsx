'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StepWizard from '@/components/ui/StepWizard'
import StepClient from '@/components/deal/StepClient'
import StepHome from '@/components/deal/StepHome'
import StepUpgrades from '@/components/deal/StepUpgrades'
import StepFinancials, { type Financials } from '@/components/deal/StepFinancials'
import StepReview from '@/components/deal/StepReview'
import Link from 'next/link'

const STEPS = [
  { key: 'client', label: 'Client' },
  { key: 'home', label: 'Home' },
  { key: 'upgrades', label: 'Upgrades' },
  { key: 'financials', label: 'Financials' },
  { key: 'review', label: 'Review' },
]

interface ClientInfo {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address?: string | null
}

interface ModelInfo {
  id: string
  name: string
  manufacturer: string
  base_price: number
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  width?: string | null
  length?: string | null
  sections?: number | null
}

interface UpgradeInfo {
  id: string
  name: string
  category: string
  price: number
  cost: number
  custom?: boolean
}

const defaultFinancials: Financials = {
  base_home_price: 0,
  upgrades_total: 0,
  freight: 3500,
  setup: 2500,
  site_prep: 0,
  trade_in: 0,
  down_payment: 0,
  interest_rate: 8.49,
  term_months: 240,
  state_code: '',
  total_cost: 0,
  sales_tax: 0,
  amount_financed: 0,
  monthly_payment: 0,
  total_interest: 0,
}

export default function EditDealPage() {
  const router = useRouter()
  const params = useParams()
  const dealId = params.id as string

  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [model, setModel] = useState<ModelInfo | null>(null)
  const [upgrades, setUpgrades] = useState<UpgradeInfo[]>([])
  const [financials, setFinancials] = useState<Financials>(defaultFinancials)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const [creating, setCreating] = useState(false)
  const [dealNumber, setDealNumber] = useState<number | null>(null)
  const [revisionNumber, setRevisionNumber] = useState(1)
  const [history, setHistory] = useState<Record<string, string>[]>([])

  // Load existing deal
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: deal } = await supabase
        .from('agreements')
        .select('*, clients(id, first_name, last_name, email, phone, address)')
        .eq('id', dealId)
        .single()

      if (!deal) {
        router.push('/agreements')
        return
      }

      setDealNumber(deal.deal_number)
      setRevisionNumber(deal.revision_number || 1)
      setHistory((deal.history as Record<string, string>[]) || [])

      // Restore client
      const clientData = deal.clients as Record<string, string> | null
      if (clientData && deal.client_id) {
        setClient({
          id: deal.client_id,
          first_name: clientData.first_name || '',
          last_name: clientData.last_name || '',
          email: clientData.email || null,
          phone: clientData.phone || null,
        })
      }

      // Restore model
      const modelData = deal.model as Record<string, string | number> | null
      if (modelData) {
        setModel({
          id: String(modelData.id || ''),
          name: String(modelData.name || ''),
          manufacturer: String(modelData.manufacturer || ''),
          base_price: Number(modelData.base_price || 0),
          bedrooms: modelData.bedrooms ? Number(modelData.bedrooms) : null,
          bathrooms: modelData.bathrooms ? Number(modelData.bathrooms) : null,
          sqft: modelData.sqft ? Number(modelData.sqft) : null,
        })
      }

      // Restore upgrades
      const upgradeData = deal.upgrades as Record<string, string | number | boolean>[] | null
      if (upgradeData && Array.isArray(upgradeData)) {
        setUpgrades(
          upgradeData.map(u => ({
            id: String(u.id || ''),
            name: String(u.name || ''),
            category: String(u.category || 'Other'),
            price: Number(u.price || 0),
            cost: Number(u.cost || 0),
            custom: Boolean(u.custom),
          })),
        )
      }

      // Restore financials
      const fin = deal.financials as Record<string, string | number> | null
      if (fin) {
        setFinancials({
          base_home_price: Number(fin.base_home_price || 0),
          upgrades_total: Number(fin.upgrades_total || 0),
          freight: Number(fin.freight || 3500),
          setup: Number(fin.setup || 2500),
          site_prep: Number(fin.site_prep || 0),
          trade_in: Number(fin.trade_in || 0),
          down_payment: Number(fin.down_payment || 0),
          interest_rate: Number(fin.interest_rate || 8.49),
          term_months: Number(fin.term || 240),
          state_code: String(fin.state_code || ''),
          total_cost: Number(fin.total || 0),
          sales_tax: Number(fin.sales_tax || 0),
          amount_financed: Number(fin.amount_financed || 0),
          monthly_payment: Number(fin.monthly_payment || 0),
          total_interest: Number(fin.total_interest || 0),
        })
      }

      setLoading(false)
    }
    load()
  }, [dealId, router])

  const saveDraft = useCallback(
    async (overrides?: { client?: ClientInfo; model?: ModelInfo; upgrades?: UpgradeInfo[]; financials?: Financials }) => {
      const c = overrides?.client ?? client
      const m = overrides?.model ?? model
      const u = overrides?.upgrades ?? upgrades
      const f = overrides?.financials ?? financials

      setSaveStatus('saving')
      const supabase = createClient()

      const payload = {
        client_id: c?.id || null,
        buyer: c
          ? { name: `${c.first_name} ${c.last_name}`, email: c.email, phone: c.phone }
          : null,
        model: m
          ? {
              id: m.id,
              name: m.name,
              manufacturer: m.manufacturer,
              base_price: m.base_price,
              bedrooms: m.bedrooms,
              bathrooms: m.bathrooms,
              sqft: m.sqft,
            }
          : null,
        upgrades: u.map(up => ({
          id: up.id,
          name: up.name,
          price: up.price,
          cost: up.cost,
          custom: up.custom || false,
        })),
        financials: {
          sale_price: f.total_cost,
          base_home_price: f.base_home_price,
          upgrades_total: f.upgrades_total,
          freight: f.freight,
          setup: f.setup,
          site_prep: f.site_prep,
          trade_in: f.trade_in,
          down_payment: f.down_payment,
          interest_rate: f.interest_rate,
          term: f.term_months,
          state_code: f.state_code,
          sales_tax: f.sales_tax,
          total: f.total_cost,
          amount_financed: f.amount_financed,
          monthly_payment: f.monthly_payment,
          total_interest: f.total_interest,
        },
      }

      try {
        await supabase.from('agreements').update(payload).eq('id', dealId)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    },
    [client, model, upgrades, financials, dealId],
  )

  function handleClientSelect(c: ClientInfo) {
    setClient(c)
    saveDraft({ client: c })
  }

  function handleModelSelect(m: ModelInfo) {
    setModel(m)
    const newFinancials = { ...financials, base_home_price: m.base_price }
    setFinancials(newFinancials)
    saveDraft({ model: m, financials: newFinancials })
  }

  function handleUpgradesChange(u: UpgradeInfo[]) {
    setUpgrades(u)
    const total = u.reduce((s, up) => s + up.price, 0)
    const newFinancials = { ...financials, upgrades_total: total }
    setFinancials(newFinancials)
    saveDraft({ upgrades: u, financials: newFinancials })
  }

  function handleFinancialsChange(f: Financials) {
    setFinancials(f)
    saveDraft({ financials: f })
  }

  async function handleSaveChanges() {
    setCreating(true)
    const supabase = createClient()

    const newRevision = revisionNumber + 1
    const newHistory = [
      ...history,
      {
        action: `Revised to v${newRevision}`,
        date: new Date().toISOString(),
      },
    ]

    try {
      await supabase
        .from('agreements')
        .update({
          revision_number: newRevision,
          history: newHistory,
          client_id: client?.id || null,
          buyer: client
            ? { name: `${client.first_name} ${client.last_name}`, email: client.email, phone: client.phone }
            : null,
          model: model
            ? {
                id: model.id,
                name: model.name,
                manufacturer: model.manufacturer,
                base_price: model.base_price,
                bedrooms: model.bedrooms,
                bathrooms: model.bathrooms,
                sqft: model.sqft,
              }
            : null,
          upgrades: upgrades.map(u => ({
            id: u.id,
            name: u.name,
            price: u.price,
            cost: u.cost,
            custom: u.custom || false,
          })),
          financials: {
            sale_price: financials.total_cost,
            base_home_price: financials.base_home_price,
            upgrades_total: financials.upgrades_total,
            freight: financials.freight,
            setup: financials.setup,
            site_prep: financials.site_prep,
            trade_in: financials.trade_in,
            down_payment: financials.down_payment,
            interest_rate: financials.interest_rate,
            term: financials.term_months,
            state_code: financials.state_code,
            sales_tax: financials.sales_tax,
            total: financials.total_cost,
            amount_financed: financials.amount_financed,
            monthly_payment: financials.monthly_payment,
            total_interest: financials.total_interest,
          },
        })
        .eq('id', dealId)

      router.push(`/agreements/${dealId}`)
    } catch {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <p className="text-sm text-slate-400 text-center py-16">Loading deal...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <Link href={`/agreements/${dealId}`} className="text-slate-400 hover:text-slate-600 text-sm">
          ← Deal #{dealNumber}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">Edit</span>
        <span className="ml-auto text-xs text-slate-400">Rev {revisionNumber}</span>
      </div>

      <StepWizard
        steps={STEPS}
        currentStep={step}
        onNext={step === STEPS.length - 1 ? handleSaveChanges : () => setStep(step + 1)}
        onBack={() => setStep(Math.max(0, step - 1))}
      >
        {step === 0 && (
          <StepClient
            selectedClientId={client?.id || null}
            onSelect={handleClientSelect}
          />
        )}
        {step === 1 && (
          <StepHome
            selectedModelId={model?.id || null}
            onSelect={handleModelSelect}
          />
        )}
        {step === 2 && (
          <StepUpgrades
            selectedUpgrades={upgrades}
            onChange={handleUpgradesChange}
          />
        )}
        {step === 3 && (
          <StepFinancials
            financials={financials}
            onChange={handleFinancialsChange}
            saveStatus={saveStatus}
          />
        )}
        {step === 4 && (
          <StepReview
            client={client}
            model={model}
            upgrades={upgrades}
            financials={financials}
            onCreateDeal={handleSaveChanges}
            creating={creating}
            isEdit
          />
        )}
      </StepWizard>
    </div>
  )
}
