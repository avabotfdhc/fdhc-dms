'use client'

import CurrencyInput from '@/components/ui/CurrencyInput'

export interface JournalLine {
  id: string
  account_id: string
  debit: number
  credit: number
  memo: string
}

interface Account {
  id: string
  code: string
  name: string
}

interface JournalLineEditorProps {
  lines: JournalLine[]
  onChange: (lines: JournalLine[]) => void
  accounts: Account[]
}

export default function JournalLineEditor({ lines, onChange, accounts }: JournalLineEditorProps) {
  const totalDebits = lines.reduce((sum, l) => sum + l.debit, 0)
  const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0)
  const diff = Math.abs(totalDebits - totalCredits)
  const isBalanced = diff < 0.01 && lines.length > 0

  function updateLine(index: number, updates: Partial<JournalLine>) {
    const updated = lines.map((l, i) => (i === index ? { ...l, ...updates } : l))
    onChange(updated)
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, i) => i !== index))
  }

  function addLine() {
    onChange([
      ...lines,
      { id: crypto.randomUUID(), account_id: '', debit: 0, credit: 0, memo: '' },
    ])
  }

  return (
    <div className={`rounded-xl border-2 ${isBalanced ? 'border-green-300' : 'border-red-300'} bg-white overflow-hidden`}>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-2 font-medium text-slate-600">Account</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600 w-36">Debit</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600 w-36">Credit</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Memo</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line, i) => (
              <tr key={line.id}>
                <td className="px-3 py-2">
                  <select
                    value={line.account_id}
                    onChange={e => updateLine(i, { account_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Select account...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <CurrencyInput
                    label=""
                    name={`debit-${line.id}`}
                    value={line.debit}
                    onChange={val => updateLine(i, { debit: val, credit: val > 0 ? 0 : line.credit })}
                  />
                </td>
                <td className="px-3 py-2">
                  <CurrencyInput
                    label=""
                    name={`credit-${line.id}`}
                    value={line.credit}
                    onChange={val => updateLine(i, { credit: val, debit: val > 0 ? 0 : line.debit })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={line.memo}
                    onChange={e => updateLine(i, { memo: e.target.value })}
                    placeholder="Memo"
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => removeLine(i)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="Remove line"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="sm:hidden divide-y divide-slate-100">
        {lines.map((line, i) => (
          <div key={line.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Line {i + 1}</span>
              <button
                onClick={() => removeLine(i)}
                className="text-slate-400 hover:text-red-500 text-xs"
              >
                Remove
              </button>
            </div>
            <select
              value={line.account_id}
              onChange={e => updateLine(i, { account_id: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select account...</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <CurrencyInput
                label="Debit"
                name={`debit-m-${line.id}`}
                value={line.debit}
                onChange={val => updateLine(i, { debit: val, credit: val > 0 ? 0 : line.credit })}
              />
              <CurrencyInput
                label="Credit"
                name={`credit-m-${line.id}`}
                value={line.credit}
                onChange={val => updateLine(i, { credit: val, debit: val > 0 ? 0 : line.debit })}
              />
            </div>
            <input
              type="text"
              value={line.memo}
              onChange={e => updateLine(i, { memo: e.target.value })}
              placeholder="Memo"
              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        ))}
      </div>

      {/* Add line + totals */}
      <div className="border-t border-slate-200 px-3 py-2">
        <button
          onClick={addLine}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          + Add Line
        </button>
      </div>
      <div className={`px-3 py-3 border-t ${isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="text-slate-500">Debits: </span>
            <span className="font-semibold text-slate-900">${totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-slate-500">Credits: </span>
            <span className="font-semibold text-slate-900">${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          {!isBalanced && (
            <div className="text-red-600 font-medium">
              Difference: ${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          )}
          {isBalanced && (
            <div className="text-green-700 font-medium">Balanced</div>
          )}
        </div>
      </div>
    </div>
  )
}
