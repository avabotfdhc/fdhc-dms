'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FormField from '@/components/ui/FormField'
import JournalLineEditor, { type JournalLine } from '@/components/JournalLineEditor'

interface Account {
  id: string
  code: string
  name: string
}

export default function NewJournalEntryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    reference: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  const [lines, setLines] = useState<JournalLine[]>([
    { id: crypto.randomUUID(), account_id: '', debit: 0, credit: 0, memo: '' },
    { id: crypto.randomUUID(), account_id: '', debit: 0, credit: 0, memo: '' },
  ])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('accounts')
        .select('id, code, name')
        .order('code')
      if (data) setAccounts(data)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const totalDebits = lines.reduce((s, l) => s + l.debit, 0)
  const totalCredits = lines.reduce((s, l) => s + l.credit, 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && lines.length > 0

  async function handleSave(post: boolean) {
    if (!form.reference) {
      setError('Reference is required')
      return
    }
    if (!isBalanced) {
      setError('Debits and credits must be balanced before saving')
      return
    }

    const validLines = lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0))
    if (validLines.length === 0) {
      setError('At least one line item is required')
      return
    }

    setSaving(true)
    setError('')

    // Create journal entry
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        reference: form.reference,
        description: form.description,
        date: form.date,
        posted: post,
      })
      .select('id')
      .single()

    if (entryError || !entry) {
      setError(entryError?.message || 'Failed to create entry')
      setSaving(false)
      return
    }

    // Insert lines
    const lineInserts = validLines.map(l => ({
      journal_entry_id: entry.id,
      account_id: l.account_id,
      debit: l.debit,
      credit: l.credit,
      memo: l.memo,
    }))

    const { error: lineError } = await supabase
      .from('journal_lines')
      .insert(lineInserts)

    if (lineError) {
      setError(lineError.message)
      setSaving(false)
      return
    }

    // If posting, update account balances
    if (post) {
      for (const line of validLines) {
        const net = line.debit - line.credit
        if (net !== 0) {
          // Fetch account, update balance
          const { data: account } = await supabase
            .from('accounts')
            .select('id, balance')
            .eq('id', line.account_id)
            .single()
          if (account) {
            await supabase
              .from('accounts')
              .update({ balance: (account.balance || 0) + net })
              .eq('id', account.id)
          }
        }
      }
    }

    router.push('/accounting/journal')
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/accounting/journal" className="text-slate-400 hover:text-slate-600 text-sm">&larr; Journal</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium">New Entry</span>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Header fields */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Entry Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Reference"
              name="reference"
              value={form.reference}
              onChange={handleChange}
              required
              placeholder="e.g. JE-001"
            />
            <FormField
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Entry description"
            />
            <FormField
              label="Date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Line items */}
        <div>
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Line Items</h2>
          <JournalLineEditor
            lines={lines}
            onChange={setLines}
            accounts={accounts}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !isBalanced}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Posting...' : 'Post Entry'}
          </button>
          <Link
            href="/accounting/journal"
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium text-center hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
